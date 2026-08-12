import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import Constants from 'expo-constants'
import { useSQLiteContext } from 'expo-sqlite'
import type { BackupStatus, OnboardingPreferences } from '@tickcap/api'
import type { LocalNotificationStatus } from '@tickcap/api'
import {
  DEFAULT_TIME_SETTINGS,
  type UserTimeSettings,
} from '@tickcap/core'
import {
  capsuleHeight,
  presetTags,
  radius,
  spacing,
  themeTypography,
  typography,
  type NativeTheme,
  type VisualThemeName,
} from '@tickcap/tokens'
import { ScreenScaffold } from '../../src/components/screen-scaffold'
import {
  buildLocalBackupArtifact,
  buildLocalExport,
} from '../../src/data/repositories/export-repository'
import {
  applyLocalRestore,
  prepareLocalRestore,
  type LocalRestorePreview,
} from '../../src/data/repositories/restore-repository'
import {
  DEFAULT_BACKUP_STATUS,
  getBackupReminderDue,
  getBackupStatus,
  recordBackupCreated,
  recordRestoreCompleted,
  updateBackupReminderInterval,
} from '../../src/data/repositories/backup-status-repository'
import {
  getEventOutboxCount,
  getRecordTimingMetrics,
  trackEvent,
} from '../../src/data/repositories/event-repository'
import type { RecordTimingMetrics } from '@tickcap/core'
import {
  getTimeSettings,
  updateTimeSettings,
} from '../../src/data/repositories/settings-repository'
import {
  createCustomTag,
  listCustomTags,
  type LocalTag,
} from '../../src/data/repositories/tag-repository'
import {
  DEFAULT_ONBOARDING_PREFERENCES,
  getOnboardingPreferences,
  updateReminderPreferences,
} from '../../src/data/repositories/onboarding-repository'
import {
  shareExportFile,
  type ExportKind,
} from '../../src/platform/share-export'
import { pickBackupText } from '../../src/platform/pick-backup'
import {
  listRecoveryBackupFiles,
  shareLatestRecoveryBackup,
} from '../../src/platform/recovery-files'
import type { ColorSchemePreference } from '../../src/data/repositories/appearance-repository'
import { SymbolIcon } from '../../src/ui/symbol-icon'
import { useTickCapTheme } from '../../src/ui/theme-provider'
import {
  disableLocalNotifications,
  reconcileLocalNotifications,
  requestLocalNotificationPermission,
  runQuickTickIdempotencyProbe,
  scheduleLocalNotificationProbe,
} from '../../src/platform/local-notifications'
import {
  DEFAULT_LOCAL_NOTIFICATION_STATUS,
  getLocalNotificationStatus,
  resetLocalNotificationSnooze,
} from '../../src/data/repositories/notification-status-repository'

function minuteClock(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function shiftedMinute(value: number, delta: number): number {
  return (value + delta + 24 * 60) % (24 * 60)
}

export default function SettingsScreen() {
  const db = useSQLiteContext()
  const {
    preferences,
    reloadPreferences,
    setColorScheme,
    setVisualTheme,
    theme,
  } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [settings, setSettings] = useState<UserTimeSettings>(
    DEFAULT_TIME_SETTINGS,
  )
  const [customTags, setCustomTags] = useState<LocalTag[]>([])
  const [reminderPreferences, setReminderPreferences] =
    useState<OnboardingPreferences>({
      ...DEFAULT_ONBOARDING_PREFERENCES,
      completed: true,
    })
  const [tagName, setTagName] = useState('')
  const [tagEmoji, setTagEmoji] = useState('✨')
  const [tagColorIndex, setTagColorIndex] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [backupStatus, setBackupStatus] = useState<BackupStatus>(
    DEFAULT_BACKUP_STATUS,
  )
  const [backupReminderDue, setBackupReminderDue] = useState(false)
  const [notificationStatus, setNotificationStatus] =
    useState<LocalNotificationStatus>(DEFAULT_LOCAL_NOTIFICATION_STATUS)
  const [recoveryPointCount, setRecoveryPointCount] = useState(0)
  const [timingMetrics, setTimingMetrics] = useState<RecordTimingMetrics>({
    sampleCount: 0,
    medianMs: null,
    withinThreeSecondsRate: null,
    quickTagSampleCount: 0,
    quickTagWithinThreeSecondsRate: null,
  })
  const [isBusy, setIsBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const refresh = useCallback(async () => {
    const [
      nextSettings,
      nextTags,
      nextEventCount,
      nextReminderPreferences,
      nextTimingMetrics,
      backupOverview,
      nextNotificationStatus,
    ] =
      await Promise.all([
      getTimeSettings(db),
      listCustomTags(db),
      getEventOutboxCount(db),
      getOnboardingPreferences(db),
      getRecordTimingMetrics(db),
      getBackupStatus(db).then(async (status) => ({
        status,
        reminderDue: await getBackupReminderDue(db, status),
        recoveryPointCount: listRecoveryBackupFiles().length,
      })),
      getLocalNotificationStatus(db),
    ])
    setSettings(nextSettings)
    setCustomTags(nextTags)
    setEventCount(nextEventCount)
    setReminderPreferences(nextReminderPreferences)
    setTimingMetrics(nextTimingMetrics)
    setBackupStatus(backupOverview.status)
    setBackupReminderDue(backupOverview.reminderDue)
    setRecoveryPointCount(backupOverview.recoveryPointCount)
    setNotificationStatus(nextNotificationStatus)
  }, [db])

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const saveMinutes = async (
    key: 'dayBoundaryMin' | 'wakeDefaultMin',
    delta: number,
  ) => {
    const next = await updateTimeSettings(db, {
      [key]: shiftedMinute(settings[key], delta),
    })
    setSettings(next)
    if (notificationStatus.enabled) {
      setNotificationStatus(
        await reconcileLocalNotifications(db, { trigger: 'settings' }),
      )
    }
    setFeedback('时间设置已保存')
  }

  const chooseVisualTheme = async (visualTheme: VisualThemeName) => {
    try {
      await setVisualTheme(visualTheme)
      setFeedback(
        visualTheme === 'chronoAmber'
          ? '已切换为时间琥珀'
          : '已切换为果冻玻璃',
      )
    } catch {
      setFeedback('主题暂时没有保存，请再试一次')
    }
  }

  const chooseColorScheme = async (
    colorScheme: ColorSchemePreference,
  ) => {
    try {
      await setColorScheme(colorScheme)
      setFeedback('明暗模式已保存')
    } catch {
      setFeedback('明暗模式暂时没有保存，请再试一次')
    }
  }

  const addTag = async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      await createCustomTag(db, {
        name: tagName,
        emoji: tagEmoji,
        color: presetTags[tagColorIndex]?.color ?? theme.primary,
      })
      setTagName('')
      setFeedback('自定义标签已添加')
      await refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时无法添加标签')
    } finally {
      setIsBusy(false)
    }
  }

  const saveReminderPreferences = async (
    patch: Partial<
      Pick<
        OnboardingPreferences,
        'reminder_interval_min' | 'seal_reminder_min'
      >
    >,
  ) => {
    const next = await updateReminderPreferences(db, {
      reminder_interval_min:
        patch.reminder_interval_min ??
        reminderPreferences.reminder_interval_min,
      seal_reminder_min:
        patch.seal_reminder_min ?? reminderPreferences.seal_reminder_min,
    })
    setReminderPreferences(next)
    const resetStatus = await resetLocalNotificationSnooze(db)
    if (notificationStatus.enabled) {
      setNotificationStatus(
        await reconcileLocalNotifications(db, { trigger: 'settings' }),
      )
    } else {
      setNotificationStatus(resetStatus)
    }
    setFeedback('提醒偏好已保存')
  }

  const enableNotifications = async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      const next = await requestLocalNotificationPermission(db, 'settings')
      setNotificationStatus(next)
      setFeedback(
        next.enabled
          ? '本地提醒已开启'
          : next.permission_status === 'denied'
            ? '系统通知已关闭，可以前往系统设置重新开启'
            : '暂时没有开启通知',
      )
    } catch {
      setFeedback('本地提醒暂时没有开启，请再试一次')
    } finally {
      setIsBusy(false)
    }
  }

  const turnOffNotifications = async () => {
    setNotificationStatus(await disableLocalNotifications(db))
    setFeedback('本地提醒已关闭，记录不会受影响')
  }

  const exportData = async (kind: ExportKind) => {
    if (isBusy) return
    setIsBusy(true)
    try {
      const now = new Date()
      const backupArtifact =
        kind === 'backup'
          ? await buildLocalBackupArtifact(
              db,
              Constants.expoConfig?.version ?? 'unknown',
              now,
            )
          : null
      const content = backupArtifact
        ? backupArtifact.content
        : await buildLocalExport(db, settings).then((data) =>
            kind === 'markdown' ? data.markdown : data.json,
          )
      await shareExportFile(kind, content)
      if (backupArtifact) {
        const nextBackupStatus = await recordBackupCreated(
          db,
          backupArtifact.summary,
          now,
        )
        setBackupStatus(nextBackupStatus)
        setBackupReminderDue(
          await getBackupReminderDue(db, nextBackupStatus, now),
        )
      }
      await trackEvent(db, 'export_done', { format: kind })
      const label =
        kind === 'markdown' ? 'Markdown' : kind === 'backup' ? '完整备份' : 'JSON'
      setFeedback(`${label}已交给系统分享`)
      await refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时无法导出')
    } finally {
      setIsBusy(false)
    }
  }

  const confirmExport = (kind: ExportKind) => {
    const label =
      kind === 'markdown' ? 'Markdown' : kind === 'backup' ? '完整备份' : 'JSON'
    Alert.alert(
      `${kind === 'backup' ? '创建' : '导出'} ${label}？`,
      '导出文件包含你的胶囊正文和私密记录，请只保存到可信位置。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: kind === 'backup' ? '继续备份' : '继续导出',
          onPress: () => void exportData(kind),
        },
      ],
    )
  }

  const applyRestore = async (preview: LocalRestorePreview) => {
    if (isBusy) return
    setIsBusy(true)
    try {
      const result = await applyLocalRestore(
        db,
        preview,
        Constants.expoConfig?.version ?? 'unknown',
      )
      await recordRestoreCompleted(db, result.counts)
      await reloadPreferences()
      await refresh()
      setFeedback(
        `恢复完成：新增 ${result.counts.insert}、更新 ${result.counts.replace}、跳过 ${result.counts.skip}；已保留导入前备份`,
      )
    } catch {
      setFeedback(
        '恢复未完成，数据库写入已全部回滚；导入前备份仍保留在本机',
      )
    } finally {
      setIsBusy(false)
    }
  }

  const chooseBackupToRestore = async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      const text = await pickBackupText()
      if (text === null) return
      const preview = await prepareLocalRestore(db, text)
      if (preview.sealDateConflicts.length > 0) {
        Alert.alert(
          '暂时不能恢复',
          `封存日期 ${preview.sealDateConflicts.join('、')} 使用了不同的稳定 ID。为避免覆盖，本次未写入任何数据。`,
        )
        return
      }
      const deletedCount = Object.values(preview.backup.payload.tables)
        .flat()
        .filter((entity) => entity.deleted_at !== null).length
      Alert.alert(
        '恢复预览',
        [
          `备份时间：${new Date(preview.backup.exported_at).toLocaleString()}`,
          `共 ${preview.entityCount} 条实体，其中删除状态 ${deletedCount} 条。`,
          `将新增 ${preview.counts.insert} 条、更新 ${preview.counts.replace} 条、跳过 ${preview.counts.skip} 条。`,
          '时间、提醒和外观设置也会恢复。开始前会自动保存当前完整备份。',
        ].join('\n'),
        [
          { text: '取消', style: 'cancel' },
          {
            text: '开始恢复',
            onPress: () => void applyRestore(preview),
          },
        ],
      )
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '无法读取这个备份文件',
      )
    } finally {
      setIsBusy(false)
    }
  }

  const chooseBackupReminderInterval = async (
    days: BackupStatus['reminder_interval_days'],
  ) => {
    const next = await updateBackupReminderInterval(db, days)
    setBackupStatus(next)
    setBackupReminderDue(await getBackupReminderDue(db, next))
    setFeedback(days === null ? '完整备份提醒已关闭' : `将每 ${days} 天提醒一次`)
  }

  const exportLatestRecoveryPoint = async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      await shareLatestRecoveryBackup()
      setFeedback('最近恢复点已交给系统分享')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时无法导出恢复点')
    } finally {
      setIsBusy(false)
    }
  }

  const confirmRecoveryPointExport = () => {
    Alert.alert(
      '导出最近恢复点？',
      '恢复点包含胶囊正文、私密记录和本机设置，请只保存到可信位置。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '继续导出',
          onPress: () => void exportLatestRecoveryPoint(),
        },
      ],
    )
  }

  return (
    <ScreenScaffold eyebrow="本地优先" title="我的">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>外观</Text>
        <Text style={styles.note}>主题改变质感，不改变你的记录和页面结构。</Text>
        <View style={styles.themeRow}>
          <ThemeChoice
            description="默认 · 温暖克制"
            icon="circle.hexagongrid"
            label="时间琥珀"
            onPress={() => void chooseVisualTheme('chronoAmber')}
            selected={preferences.visualTheme === 'chronoAmber'}
          />
          <ThemeChoice
            description="明亮 · 更有弹性"
            icon="drop"
            label="果冻玻璃"
            onPress={() => void chooseVisualTheme('jellyGlass')}
            selected={preferences.visualTheme === 'jellyGlass'}
          />
        </View>
        <View style={styles.segmentRow}>
          {(
            [
              ['system', '跟随系统'],
              ['light', '浅色'],
              ['dark', '深色'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: preferences.colorScheme === value,
              }}
              key={value}
              onPress={() => void chooseColorScheme(value)}
              style={[
                styles.segment,
                preferences.colorScheme === value && styles.segmentSelected,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  preferences.colorScheme === value &&
                    styles.segmentTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>时间设置</Text>
        <Text style={styles.note}>
          修改日界只影响之后的新记录，不重写历史归属日。
        </Text>
        <TimeSettingRow
          label="日界"
          onDecrease={() => void saveMinutes('dayBoundaryMin', -15)}
          onIncrease={() => void saveMinutes('dayBoundaryMin', 15)}
          value={minuteClock(settings.dayBoundaryMin)}
        />
        <TimeSettingRow
          label="默认起床"
          onDecrease={() => void saveMinutes('wakeDefaultMin', -15)}
          onIncrease={() => void saveMinutes('wakeDefaultMin', 15)}
          value={minuteClock(settings.wakeDefaultMin)}
        />
        <View style={styles.row}>
          <Text style={styles.label}>时区</Text>
          <Text style={styles.value}>{settings.timezone}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>提醒偏好</Text>
        <Text style={styles.note}>
          只在本机安排提醒，不上传通知内容。刚记录或刚打开 App 后，会重新等待一个完整间隔。
        </Text>
        <View style={styles.segmentRow}>
          {([30, 60, 120] as const).map((minutes) => (
            <Pressable
              accessible
              accessibilityLabel={`每${minutes}分钟提醒`}
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  reminderPreferences.reminder_interval_min === minutes,
              }}
              key={minutes}
              onPress={() =>
                void saveReminderPreferences({
                  reminder_interval_min: minutes,
                })
              }
              style={[
                styles.segment,
                reminderPreferences.reminder_interval_min === minutes &&
                  styles.segmentSelected,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  reminderPreferences.reminder_interval_min === minutes &&
                    styles.segmentTextSelected,
                ]}
              >
                {minutes < 60 ? '30 分钟' : `${minutes / 60} 小时`}
              </Text>
            </Pressable>
          ))}
        </View>
        <TimeSettingRow
          label="晚间封存"
          onDecrease={() =>
            void saveReminderPreferences({
              seal_reminder_min: shiftedMinute(
                reminderPreferences.seal_reminder_min,
                -30,
              ),
            })
          }
          onIncrease={() =>
            void saveReminderPreferences({
              seal_reminder_min: shiftedMinute(
                reminderPreferences.seal_reminder_min,
                30,
              ),
            })
          }
          value={minuteClock(reminderPreferences.seal_reminder_min)}
        />
        {notificationStatus.enabled ? (
          <>
            <Text style={styles.note}>
              本地提醒已开启
              {notificationStatus.scheduled.interval
                ? ` · 下次记录提醒 ${new Date(
                    notificationStatus.scheduled.interval.fire_at,
                  ).toLocaleString()}`
                : ''}
              {notificationStatus.scheduled.seal
                ? ` · 下次封存提醒 ${new Date(
                    notificationStatus.scheduled.seal.fire_at,
                  ).toLocaleString()}`
                : ''}
            </Text>
            {notificationStatus.snooze_level > 0 ? (
              <Text style={styles.note}>
                最近几次没有回应，提醒已自动放慢为原间隔的
                {2 ** notificationStatus.snooze_level} 倍；完成一条记录后会恢复。
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void turnOffNotifications()}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>关闭本地提醒</Text>
            </Pressable>
            {__DEV__ ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void scheduleLocalNotificationProbe(db).then(() => {
                      setFeedback('3 秒后发送一条本地验证提醒')
                    })
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>3 秒验证通知</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void runQuickTickIdempotencyProbe(db).then((result) => {
                      setFeedback(
                        result
                          ? `重复 action 只生成一颗胶囊 · ${result.capsuleId}`
                          : '没有可用的快捷标签',
                      )
                    })
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>验证 action 幂等</Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.note}>
              {notificationStatus.permission_status === 'denied'
                ? '系统通知目前已关闭。TickCap 不会反复请求权限，记录功能不受影响。'
                : '尚未开启系统通知。你也可以只保留这些偏好。'}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() =>
                notificationStatus.permission_status === 'denied'
                  ? void Linking.openSettings()
                  : void enableNotifications()
              }
              style={({ pressed }) => [
                styles.primaryButton,
                isBusy && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {notificationStatus.permission_status === 'denied'
                  ? '打开系统设置'
                  : '开启本地提醒'}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          自定义标签 · {customTags.length}/5
        </Text>
        {customTags.length ? (
          <View style={styles.tagList}>
            {customTags.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tagChip, { borderColor: tag.color }]}
              >
                <Text style={styles.tagText}>
                  {tag.emoji} {tag.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.note}>可以添加最多 5 个自己的标签。</Text>
        )}
        {customTags.length < 5 ? (
          <>
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel="标签图标"
                maxLength={4}
                onChangeText={setTagEmoji}
                style={styles.emojiInput}
                value={tagEmoji}
              />
              <TextInput
                accessibilityLabel="标签名称"
                maxLength={12}
                onChangeText={setTagName}
                placeholder="标签名"
                placeholderTextColor={theme.text3}
                style={styles.nameInput}
                value={tagName}
              />
            </View>
            <View style={styles.colorRow}>
              {presetTags.slice(0, 6).map((tag, index) => (
                <Pressable
                  accessible
                  accessibilityLabel={`选择${tag.name}色`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: index === tagColorIndex }}
                  key={tag.entityId}
                  onPress={() => setTagColorIndex(index)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: tag.color },
                    index === tagColorIndex && styles.colorSelected,
                  ]}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isBusy || !tagName.trim()}
              onPress={() => void addTag()}
              style={({ pressed }) => [
                styles.primaryButton,
                (!tagName.trim() || isBusy) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>添加标签</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>数据</Text>
        <Text style={styles.note}>
          导出永久免费。Markdown/JSON 适合阅读；完整备份包含本机设置和已删除状态，用于之后恢复。
        </Text>
        {backupReminderDue ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            可以给最近的记录留一份完整备份了。
          </Text>
        ) : null}
        <Text style={styles.note}>
          {backupStatus.last_backup
            ? `最近生成：${new Date(backupStatus.last_backup.created_at).toLocaleString()} · ${backupStatus.last_backup.summary.entity_count} 条实体（含删除状态 ${backupStatus.last_backup.summary.soft_deleted_count} 条）`
            : '还没有生成过完整备份。'}
        </Text>
        {backupStatus.last_restore ? (
          <Text style={styles.note}>
            最近恢复：
            {new Date(
              backupStatus.last_restore.completed_at,
            ).toLocaleString()}
          </Text>
        ) : null}
        <View style={styles.exportRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirmExport('markdown')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>导出 Markdown</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirmExport('json')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>导出 JSON</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => confirmExport('backup')}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>创建完整备份</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => void chooseBackupToRestore()}
          style={({ pressed }) => [
            styles.secondaryButton,
            isBusy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>从完整备份恢复</Text>
        </Pressable>
        <Text style={styles.label}>App 内备份提醒</Text>
        <View style={styles.segmentRow}>
          {(
            [
              [7, '7 天'],
              [14, '14 天'],
              [30, '30 天'],
              [null, '关闭'],
            ] as const
          ).map(([days, label]) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: backupStatus.reminder_interval_days === days,
              }}
              key={label}
              onPress={() => void chooseBackupReminderInterval(days)}
              style={[
                styles.segment,
                backupStatus.reminder_interval_days === days &&
                  styles.segmentSelected,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  backupStatus.reminder_interval_days === days &&
                    styles.segmentTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.note}>
          本机有 {recoveryPointCount} 份导入前恢复点。它们仍在 App
          沙盒中，卸载 App 后可能丢失。
        </Text>
        {recoveryPointCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={confirmRecoveryPointExport}
            style={({ pressed }) => [
              styles.secondaryButton,
              isBusy && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>导出最近恢复点</Text>
          </Pressable>
        ) : null}
        <Text style={styles.note}>
          长期保存：在系统分享中选择“存储到文件”，再选择 iCloud Drive
          或“我的 iPhone”。只有另存到 App 之外，卸载后仍可找回。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>本地诊断</Text>
        <Text style={styles.note}>
          待同步产品事件 {eventCount} 条。事件只记录动作和统计值，不保存胶囊正文。
        </Text>
        <Text style={styles.note}>
          最近 {timingMetrics.sampleCount}/30 次记录：
          {timingMetrics.withinThreeSecondsRate === null
            ? '等待样本'
            : `3 秒达成率 ${Math.round(timingMetrics.withinThreeSecondsRate * 100)}%`}
          {timingMetrics.medianMs === null
            ? ''
            : ` · 中位数 ${Math.round(timingMetrics.medianMs)}ms`}
        </Text>
        <Text style={styles.note}>
          快速标签 {timingMetrics.quickTagSampleCount} 次：
          {timingMetrics.quickTagWithinThreeSecondsRate === null
            ? '等待样本'
            : `${Math.round(timingMetrics.quickTagWithinThreeSecondsRate * 100)}% 在 3 秒内`}
        </Text>
      </View>

      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      <Text style={styles.footer}>TickCap iOS · 个人本地模式</Text>
    </ScreenScaffold>
  )
}

function TimeSettingRow({
  label,
  onDecrease,
  onIncrease,
  value,
}: {
  label: string
  onDecrease: () => void
  onIncrease: () => void
  value: string
}) {
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel={`${label}提前15分钟`}
          accessibilityRole="button"
          onPress={onDecrease}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>−15</Text>
        </Pressable>
        <Text style={styles.timeValue}>{value}</Text>
        <Pressable
          accessibilityLabel={`${label}推后15分钟`}
          accessibilityRole="button"
          onPress={onIncrease}
          style={styles.stepButton}
        >
          <Text style={styles.stepText}>+15</Text>
        </Pressable>
      </View>
    </View>
  )
}

function ThemeChoice({
  description,
  icon,
  label,
  onPress,
  selected,
}: {
  description: string
  icon: 'circle.hexagongrid' | 'drop'
  label: string
  onPress: () => void
  selected: boolean
}) {
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.themeChoice,
        selected && styles.themeChoiceSelected,
      ]}
    >
      <View style={styles.themeIcon}>
        <SymbolIcon
          color={selected ? theme.primary : theme.text2}
          name={icon}
          size={typography.scale.title.size}
        />
      </View>
      <Text style={styles.themeLabel}>{label}</Text>
      <Text style={styles.themeDescription}>{description}</Text>
    </Pressable>
  )
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
  card: {
    padding: spacing[3],
    gap: spacing[2],
    borderRadius: radius.capsule,
    backgroundColor: theme.surface,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  themeChoice: {
    flex: 1,
    minHeight: capsuleHeight.max,
    padding: spacing[3],
    gap: spacing[1],
    borderRadius: theme.capsuleRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
  },
  themeChoiceSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  themeIcon: {
    width: capsuleHeight.min,
    height: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: theme.surface,
  },
  themeLabel: {
    color: theme.text1,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
  },
  themeDescription: {
    color: theme.text2,
    fontSize: typography.scale.micro.size,
    lineHeight: typography.scale.micro.lineHeight,
  },
  sectionTitle: {
    color: theme.text1,
    fontSize: typography.scale.bodyLg.size,
    lineHeight: typography.scale.bodyLg.lineHeight,
    fontWeight: typography.scale.title.weight,
  },
  row: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  label: {
    color: theme.text1,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
  },
  value: {
    flexShrink: 1,
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  segment: {
    flex: 1,
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: theme.surface2,
  },
  segmentSelected: {
    backgroundColor: theme.primary,
  },
  segmentText: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: typography.scale.micro.weight,
  },
  segmentTextSelected: {
    color: theme.surface,
  },
  stepButton: {
    minWidth: capsuleHeight.min,
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: theme.surface2,
  },
  stepText: {
    color: theme.primary,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: typography.scale.micro.weight,
  },
  timeValue: {
    color: theme.text1,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
    fontWeight: typography.scale.title.weight,
  },
  note: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  tagChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderWidth: spacing[0] / 4,
    borderRadius: radius.pill,
  },
  tagText: {
    color: theme.text1,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  emojiInput: {
    minWidth: capsuleHeight.min,
    minHeight: capsuleHeight.min,
    padding: spacing[2],
    textAlign: 'center',
    borderRadius: radius.input,
    color: theme.text1,
    backgroundColor: theme.surface2,
    fontSize: typography.scale.body.size,
  },
  nameInput: {
    flex: 1,
    minHeight: capsuleHeight.min,
    paddingHorizontal: spacing[3],
    borderRadius: radius.input,
    color: theme.text1,
    backgroundColor: theme.surface2,
    fontSize: typography.scale.body.size,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[1],
  },
  colorDot: {
    width: capsuleHeight.min,
    height: capsuleHeight.min,
    borderRadius: radius.pill,
    borderWidth: spacing[0] / 2,
    borderColor: theme.surface,
  },
  colorSelected: {
    borderWidth: spacing[1] / 2,
    borderColor: theme.text1,
  },
  primaryButton: {
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: theme.primary,
  },
  primaryButtonText: {
    color: theme.surface,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
    fontWeight: typography.scale.title.weight,
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  secondaryButton: {
    flex: 1,
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: theme.surface2,
  },
  secondaryButtonText: {
    textAlign: 'center',
    color: theme.text1,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: typography.scale.micro.weight,
  },
  feedback: {
    color: theme.primary,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    textAlign: 'center',
  },
  footer: {
    color: theme.text3,
    fontSize: typography.scale.micro.size,
    lineHeight: typography.scale.micro.lineHeight,
    textAlign: 'center',
  },
  disabled: {
    opacity: theme.disabledOpacity,
  },
  pressed: {
    opacity: theme.pressedOpacity,
  },
})
}
