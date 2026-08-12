import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import type { CapsuleEntity, DaySealEntity } from '@tickcap/api'
import {
  DEFAULT_TIME_SETTINGS,
  computeGaps,
  getLocalParts,
  logicalToday,
  type Gap,
  type UserTimeSettings,
} from '@tickcap/core'
import {
  capsuleHeight,
  capsuleHeightFor,
  jellyGlassMaterials,
  jellyTabLayout,
  presetTags,
  radius,
  spacing,
  themeTypography,
  timelineLayout,
  typography,
  visualTagColor,
  withAlpha,
  type NativeTheme,
} from '@tickcap/tokens'
import {
  createCapsule,
  listCapsulesByDate,
  softDeleteCapsule,
  updateCapsule,
} from '../../src/data/repositories/capsule-repository'
import {
  getSealByDate,
  prepareSealDay,
  sealDay,
  unsealDay,
} from '../../src/data/repositories/seal-repository'
import { trackEvent } from '../../src/data/repositories/event-repository'
import { getTimeSettings } from '../../src/data/repositories/settings-repository'
import {
  listQuickTags,
  listTags,
  type LocalTag,
} from '../../src/data/repositories/tag-repository'
import { ReviewContent } from '../../src/components/review-content'
import { useTodayViewStore } from '../../src/state/today-view-store'
import { AuroraBackground } from '../../src/ui/aurora-background'
import { LiquidGlassSurface } from '../../src/ui/liquid-glass-surface'
import { SymbolIcon } from '../../src/ui/symbol-icon'
import { symbolForTagName } from '../../src/ui/tag-symbol'
import { useTickCapTheme } from '../../src/ui/theme-provider'
import {
  reconcileLocalNotifications,
  requestLocalNotificationPermission,
} from '../../src/platform/local-notifications'
import {
  getLocalNotificationStatus,
  markFirstSealNotificationOfferShown,
} from '../../src/data/repositories/notification-status-repository'

function clock(iso: string, settings: UserTimeSettings): string {
  const parts = getLocalParts(new Date(iso), settings.timezone)
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

function tagFor(capsule: CapsuleEntity, tags: LocalTag[]) {
  const id = capsule.tag_ids[0]
  return tags.find((tag) => tag.id === id)
}

function dateTitle(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
    new Date(Date.UTC(year!, month! - 1, day!, 12)).getUTCDay()
  ]
  return `${month}月${day}日  ${weekday}`
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}月${day}日`
}

function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}分钟`
  return rest === 0 ? `${hours}小时` : `${hours}小时${rest}分`
}

function capsuleMinutes(capsule: CapsuleEntity): number {
  return Math.max(
    1,
    Math.round(
      (new Date(capsule.end_at).getTime() -
        new Date(capsule.start_at).getTime()) /
        60_000,
    ),
  )
}

function naturalTagTitle(tag?: LocalTag): string {
  if (!tag) return '这一刻'
  if (tag.name === '工作') return '专注工作'
  return tag.name
}

export default function TodayScreen() {
  const db = useSQLiteContext()
  const { focus } = useLocalSearchParams<{ focus?: string }>()
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [now, setNow] = useState(() => new Date())
  const [settings, setSettings] = useState(DEFAULT_TIME_SETTINGS)
  const [tags, setTags] = useState<LocalTag[]>([])
  const [quickTags, setQuickTags] = useState<LocalTag[]>([])
  const recordStartedAt = useRef<number | null>(null)
  const today = useMemo(() => logicalToday(now, settings), [now])
  const [capsules, setCapsules] = useState<CapsuleEntity[]>([])
  const [seal, setSeal] = useState<DaySealEntity | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const draft = useTodayViewStore((state) => state.draft)
  const editingId = useTodayViewStore((state) => state.editingId)
  const editSummary = useTodayViewStore((state) => state.editSummary)
  const backfill = useTodayViewStore((state) => state.backfill)
  const backfillSummary = useTodayViewStore((state) => state.backfillSummary)
  const feedback = useTodayViewStore((state) => state.feedback)
  const setDraft = useTodayViewStore((state) => state.setDraft)
  const openEditorState = useTodayViewStore((state) => state.openEditor)
  const closeEditor = useTodayViewStore((state) => state.closeEditor)
  const setEditSummary = useTodayViewStore((state) => state.setEditSummary)
  const openBackfill = useTodayViewStore((state) => state.openBackfill)
  const closeBackfill = useTodayViewStore((state) => state.closeBackfill)
  const setBackfillSummary = useTodayViewStore(
    (state) => state.setBackfillSummary,
  )
  const setFeedback = useTodayViewStore((state) => state.setFeedback)
  const sealPreview = useTodayViewStore((state) => state.sealPreview)
  const sealStep = useTodayViewStore((state) => state.sealStep)
  const sealNote = useTodayViewStore((state) => state.sealNote)
  const sealedStreak = useTodayViewStore((state) => state.sealedStreak)
  const openSeal = useTodayViewStore((state) => state.openSeal)
  const showSealReview = useTodayViewStore((state) => state.showSealReview)
  const setSealNote = useTodayViewStore((state) => state.setSealNote)
  const completeSeal = useTodayViewStore((state) => state.completeSeal)
  const closeSeal = useTodayViewStore((state) => state.closeSeal)
  const editing = capsules.find((capsule) => capsule.id === editingId) ?? null
  const gaps = useMemo(
    () =>
      computeGaps(
        capsules.map((capsule) => ({
          startAt: new Date(capsule.start_at),
          endAt: new Date(capsule.end_at),
        })),
        { now },
      ),
    [capsules, now],
  )
  const timelineItems = useMemo(() => {
    const items: (
      | { kind: 'capsule'; startAt: Date; capsule: CapsuleEntity }
      | { kind: 'gap'; startAt: Date; gap: Gap }
    )[] = [
      ...capsules.map((capsule) => ({
        kind: 'capsule' as const,
        startAt: new Date(capsule.start_at),
        capsule,
      })),
      ...gaps.map((gap) => ({
        kind: 'gap' as const,
        startAt: gap.startAt,
        gap,
      })),
    ]
    return items.sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
  }, [capsules, gaps])
  const refresh = useCallback(async () => {
    const [nextSettings, nextTags, nextQuickTags] = await Promise.all([
      getTimeSettings(db),
      listTags(db),
      listQuickTags(db),
    ])
    const nextToday = logicalToday(new Date(), nextSettings)
    const [nextCapsules, nextSeal] = await Promise.all([
      listCapsulesByDate(db, nextToday),
      getSealByDate(db, nextToday),
    ])
    setSettings(nextSettings)
    setTags(nextTags)
    setQuickTags(nextQuickTags)
    setCapsules(nextCapsules)
    setSeal(nextSeal)
  }, [db])

  useEffect(() => {
    void refresh()
  }, [refresh])
  useEffect(() => {
    if (focus === 'tickbar') setComposerExpanded(true)
    if (focus === 'tickbar' || focus === 'timeline') void refresh()
  }, [focus, refresh])
  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date())
        void refresh()
      }
    })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [refresh])

  const saveNew = async (tagId?: string) => {
    if (isSaving) return
    setIsSaving(true)
    setFeedback('')
    try {
      const startedAt = recordStartedAt.current ?? Date.now()
      if (recordStartedAt.current === null) {
        await trackEvent(db, 'record_start', { entry: 'tickbar' })
      }
      await createCapsule(
        db,
        {
          summary: draft,
          tagIds: tagId ? [tagId] : [],
          elapsedMs: Date.now() - startedAt,
          recordEntry: tagId ? 'quick_tag' : 'text',
        },
        settings,
      )
      setDraft('')
      setComposerExpanded(false)
      recordStartedAt.current = null
      setFeedback('已记下这一刻')
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await refresh()
      await reconcileLocalNotifications(db, { trigger: 'record' })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时没记下来，请再试一次')
    } finally {
      setIsSaving(false)
    }
  }

  const openEditor = (capsule: CapsuleEntity) => {
    if (seal) {
      setFeedback('先解封这一天，再修改记录')
      return
    }
    openEditorState(capsule.id, capsule.summary ?? '')
  }

  const beginBackfill = (gap: Gap) => {
    if (seal) {
      setFeedback('先解封这一天，再补记空隙')
      return
    }
    recordStartedAt.current = Date.now()
    void trackEvent(db, 'record_start', { entry: 'gap' })
    openBackfill({
      startAt: gap.startAt.toISOString(),
      endAt: gap.endAt.toISOString(),
      minutes: gap.minutes,
    })
  }

  const saveEdit = async (shouldClose = true) => {
    if (!editing || isSaving) return
    setIsSaving(true)
    try {
      await updateCapsule(db, editing.id, { summary: editSummary })
      if (shouldClose) closeEditor()
      setFeedback('修改已保存')
      await refresh()
      await reconcileLocalNotifications(db, { trigger: 'record' })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时没保存，请再试一次')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = () => {
    if (!editing) return
    Alert.alert('删除这条记录？', '删除后会从时间轴移除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const id = editing.id
          closeEditor()
          void softDeleteCapsule(db, id)
            .then(refresh)
            .then(() => setFeedback('记录已删除'))
            .catch((error: unknown) => {
              setFeedback(error instanceof Error ? error.message : '暂时没删除，请再试一次')
            })
        },
      },
    ])
  }

  const saveBackfill = async (tagId?: string) => {
    if (!backfill || isSaving) return
    setIsSaving(true)
    setFeedback('')
    try {
      await createCapsule(
        db,
        {
          startAt: new Date(backfill.startAt),
          endAt: new Date(backfill.endAt),
          summary: backfillSummary,
          tagIds: tagId ? [tagId] : [],
          source: 'backfill',
          recordEntry: 'gap',
          elapsedMs:
            recordStartedAt.current === null
              ? 0
              : Date.now() - recordStartedAt.current,
        },
        settings,
      )
      closeBackfill()
      recordStartedAt.current = null
      setFeedback('空隙已补上')
      void Haptics.selectionAsync()
      await refresh()
      await reconcileLocalNotifications(db, { trigger: 'record' })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时没补上，请再试一次')
    } finally {
      setIsSaving(false)
    }
  }

  const beginSeal = async () => {
    if (isSaving || capsules.length === 0 || seal) return
    setIsSaving(true)
    try {
      await trackEvent(db, 'seal_start', { capsule_count: capsules.length })
      openSeal(
        await prepareSealDay(
          db,
          today,
          settings,
          (id) => tags.find((tag) => tag.id === id)?.name ?? '记录',
        ),
      )
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时无法封存')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmSeal = async () => {
    if (isSaving || !sealPreview) return
    setIsSaving(true)
    try {
      const result = await sealDay(
        db,
        sealPreview.date,
        sealNote,
        settings,
        (id) => tags.find((tag) => tag.id === id)?.name ?? '记录',
      )
      completeSeal(result.seal.streak)
      setFeedback('这一天已封存')
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      )
      await refresh()
      await reconcileLocalNotifications(db, { trigger: 'seal' })
      const notificationStatus = await getLocalNotificationStatus(db)
      if (
        !notificationStatus.first_seal_offer_shown &&
        notificationStatus.permission_status === 'not_determined'
      ) {
        await markFirstSealNotificationOfferShown(db)
        Alert.alert(
          '要不要从明天开始轻轻提醒？',
          '只在本机安排记录和晚间封存提醒，随时可以在“我的”里关闭。',
          [
            { text: '暂不开启', style: 'cancel' },
            {
              text: '开启提醒',
              onPress: () => {
                void requestLocalNotificationPermission(db, 'first_seal').then(
                  (status) => {
                    setFeedback(
                      status.enabled
                        ? '本地提醒已开启'
                        : '没有开启通知，可以稍后在“我的”中调整',
                    )
                  },
                )
              },
            },
          ],
        )
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时无法封存')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmUnseal = () => {
    if (!seal || isSaving) return
    Alert.alert('解封这一天？', '可以继续修改记录，再次封存不会影响首次 Streak。', [
      { text: '取消', style: 'cancel' },
      {
        text: '解封',
        onPress: () => {
          setIsSaving(true)
          void unsealDay(db, today)
            .then(refresh)
            .then(() =>
              reconcileLocalNotifications(db, { trigger: 'seal' }),
            )
            .then(() => setFeedback('已解封，可以继续记录'))
            .catch((error: unknown) => {
              setFeedback(error instanceof Error ? error.message : '暂时无法解封')
            })
            .finally(() => setIsSaving(false))
        },
      },
    ])
  }

  const tickIslandBody = (
    <>
      <View style={styles.quickTagRow}>
        {quickTags.map((tag) => {
          const quickColor = visualTagColor(
            tag.id,
            tag.color,
            theme.visualTheme,
            theme.mode,
          )
          return (
            <Pressable
              accessibilityHint="点一下立即完成记录"
              accessibilityLabel={`记录${tag.name}`}
              accessibilityRole="button"
              disabled={isSaving}
              key={tag.id}
              onPress={() => void saveNew(tag.id)}
              style={({ pressed }) => [
                styles.quickTag,
                pressed && styles.pressed,
              ]}
            >
              <SymbolIcon
                color={quickColor}
                name={symbolForTagName(tag.name)}
                size={typography.scale.caption.size}
              />
              <Text style={[styles.quickTagText, { color: quickColor }]}>
                {tag.name}
              </Text>
            </Pressable>
          )
        })}
        <Pressable
          accessibilityLabel="更多标签"
          accessibilityRole="button"
          onPress={() => setComposerExpanded(true)}
          style={styles.moreTag}
        >
          <SymbolIcon
            color={theme.text2}
            name="ellipsis"
            size={typography.scale.caption.size}
          />
        </Pressable>
      </View>
      <View style={styles.composerRow}>
        <TextInput
          accessibilityLabel="这段时间在做什么"
          maxLength={200}
          onChangeText={setDraft}
          onFocus={() => {
            if (recordStartedAt.current === null) {
              recordStartedAt.current = Date.now()
              void trackEvent(db, 'record_start', { entry: 'tickbar' })
            }
          }}
          placeholder="这段时间在做什么…"
          placeholderTextColor={theme.text3}
          style={styles.composerInput}
          value={draft}
        />
        <Pressable
          accessibilityLabel={draft.trim() ? '记录此刻' : '展开记录'}
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() =>
            draft.trim() ? void saveNew() : setComposerExpanded(true)
          }
          style={({ pressed }) => [
            styles.tickButtonWrap,
            pressed && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={[theme.actionStart, theme.actionEnd]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.tickButton}
          >
            <SymbolIcon
              color={theme.surface}
              name="plus"
              size={typography.scale.title.size}
            />
          </LinearGradient>
        </Pressable>
      </View>
    </>
  )

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{dateTitle(today)}</Text>
            <Text style={styles.daySummary}>
              {capsules.length}颗胶囊
              {seal ? ` · 连续第${seal.streak}天` : ''}
            </Text>
          </View>
          <Pressable
            accessibilityHint={seal ? '点一下可以解封' : '进入今日封存'}
            accessibilityLabel={seal ? '已封存' : '封存'}
            accessibilityRole="button"
            disabled={!seal && (capsules.length === 0 || isSaving)}
            onPress={seal ? confirmUnseal : () => void beginSeal()}
            style={({ pressed }) => [
              styles.sealPillPressable,
              styles.sealPill,
              theme.visualTheme === 'jellyGlass' &&
                styles.sealPillJelly,
              !seal && capsules.length === 0 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {theme.visualTheme === 'jellyGlass' ? (
              <LiquidGlassSurface
                borderRadius={radius.pill}
                isInteractive
                style={styles.sealGlass}
              >
                <View style={styles.sealPillContent}>
                  <SymbolIcon
                    color={theme.text2}
                    name={seal ? 'archivebox.fill' : 'archivebox'}
                    size={typography.scale.body.size}
                  />
                  <Text style={styles.sealPillText}>
                    {seal ? '已封存' : '封存'}
                  </Text>
                </View>
              </LiquidGlassSurface>
            ) : (
              <>
                <SymbolIcon
                  color={theme.text2}
                  name={seal ? 'archivebox.fill' : 'archivebox'}
                  size={typography.scale.body.size}
                />
                <Text style={styles.sealPillText}>
                  {seal ? '已封存' : '封存'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {seal ? (
          <View style={styles.sealedNotice}>
            <Text style={styles.emptyTitle}>这一天已经安放好了</Text>
            <Text style={styles.caption}>需要补记时，先轻点右上角解封。</Text>
          </View>
        ) : null}
        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}

        <View style={styles.timeline}>
          {capsules.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <SymbolIcon
                  color={theme.primary}
                  name="capsule"
                  size={typography.scale.display.size}
                />
              </View>
              <Text style={styles.emptyTitle}>今天还很轻</Text>
              <Text style={styles.caption}>装进第一颗胶囊吧。</Text>
            </View>
          ) : (
            timelineItems.map((item) => {
              if (item.kind === 'gap') {
                const gap = item.gap
                return (
                  <View
                    key={`gap:${gap.startAt.toISOString()}:${gap.endAt.toISOString()}`}
                    style={styles.timelineRow}
                  >
                    <Text style={styles.time}>
                      {clock(gap.startAt.toISOString(), settings)}
                    </Text>
                    <View style={styles.railColumn}>
                      <View style={styles.rail} />
                      <View style={styles.gapNode} />
                    </View>
                    <Pressable
                      accessibilityHint="点一下为这段空白补记"
                      accessibilityLabel={`${clock(gap.startAt.toISOString(), settings)} 到 ${clock(gap.endAt.toISOString(), settings)}，空白 ${gap.minutes} 分钟`}
                      accessibilityRole="button"
                      onLongPress={() => beginBackfill(gap)}
                      onPress={() => beginBackfill(gap)}
                      style={({ pressed }) => [
                        styles.gapPressable,
                        theme.visualTheme !== 'jellyGlass' &&
                          styles.gap,
                        pressed && styles.pressed,
                      ]}
                    >
                      {theme.visualTheme === 'jellyGlass' ? (
                        <LiquidGlassSurface
                          borderRadius={theme.capsuleRadius}
                          isInteractive
                          style={styles.gapGlass}
                        >
                          <View style={styles.gapContent}>
                            <SymbolIcon
                              color={theme.text3}
                              name="viewfinder"
                              size={typography.scale.body.size}
                            />
                            <Text style={styles.gapText}>
                              {durationText(gap.minutes)}空白 · 补一颗？
                            </Text>
                          </View>
                        </LiquidGlassSurface>
                      ) : (
                        <>
                          <SymbolIcon
                            color={theme.text3}
                            name="viewfinder"
                            size={typography.scale.body.size}
                          />
                          <Text style={styles.gapText}>
                            {durationText(gap.minutes)}空白 · 补一颗？
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )
              }
              const capsule = item.capsule
              const tag = tagFor(capsule, tags)
              const minutes = capsuleMinutes(capsule)
              const tagColor = visualTagColor(
                tag?.id,
                tag?.color ?? theme.primary,
                theme.visualTheme,
                theme.mode,
              )
              const cardHeight = capsuleHeightFor(
                minutes,
                theme.visualTheme,
              )
              const capsuleContents = (
                <View
                  style={
                    theme.visualTheme === 'jellyGlass'
                      ? styles.jellyCapsuleContent
                      : undefined
                  }
                >
                  <View style={styles.capsuleTop}>
                    <View
                      style={[
                        styles.capsuleIcon,
                        {
                          backgroundColor: withAlpha(
                            tagColor,
                            theme.capsuleIconTintAlpha,
                          ),
                        },
                      ]}
                    >
                      <SymbolIcon
                        color={tagColor}
                        name={symbolForTagName(tag?.name)}
                        size={typography.scale.bodyLg.size}
                      />
                    </View>
                    <View style={styles.capsuleCopy}>
                      <Text numberOfLines={2} style={styles.capsuleTitle}>
                        {capsule.summary?.trim() || naturalTagTitle(tag)}
                      </Text>
                      {capsule.detail ? (
                        <Text numberOfLines={2} style={styles.summary}>
                          {capsule.detail}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.duration, { color: tagColor }]}>
                      {durationText(minutes)}
                    </Text>
                  </View>
                </View>
              )
              return (
                <View key={capsule.id} style={styles.timelineRow}>
                  <Text style={styles.time}>
                    {clock(capsule.start_at, settings)}
                  </Text>
                  <View style={styles.railColumn}>
                    <View style={styles.rail} />
                    <View
                      style={[
                        styles.nodeGlow,
                        {
                          backgroundColor: withAlpha(
                            tagColor,
                            theme.nodeGlowAlpha,
                          ),
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.node,
                        { backgroundColor: tagColor },
                      ]}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel={`${clock(capsule.start_at, settings)} 到 ${clock(capsule.end_at, settings)}，${tag?.name ?? '记录'}，${capsule.summary ?? naturalTagTitle(tag)}`}
                    accessibilityRole="button"
                    onPress={() => openEditor(capsule)}
                    style={({ pressed }) => [
                      styles.capsulePressable,
                      theme.visualTheme !== 'jellyGlass' &&
                        styles.capsule,
                      {
                        minHeight: cardHeight,
                        shadowColor: tagColor,
                        shadowOpacity: theme.capsuleShadowAlpha,
                      },
                      theme.visualTheme !== 'jellyGlass' && {
                        backgroundColor: withAlpha(
                          tagColor,
                          theme.capsuleTintAlpha,
                        ),
                        borderColor: withAlpha(
                          tagColor,
                          theme.capsuleBorderAlpha,
                        ),
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    {theme.visualTheme === 'jellyGlass' ? (
                      <LiquidGlassSurface
                        borderRadius={theme.capsuleRadius}
                        isInteractive
                        showRefractionBlob={minutes >= 60}
                        style={styles.jellyCapsuleSurface}
                        tintColor={tagColor}
                        variant="tinted"
                      >
                        {capsuleContents}
                      </LiquidGlassSurface>
                    ) : (
                      capsuleContents
                    )}
                  </Pressable>
                </View>
              )
            })
          )}
          {capsules.length > 0 ? (
            <View style={styles.nowRow}>
              <View style={styles.nowLine} />
              <View style={styles.nowNode} />
              <Text style={styles.nowText}>
                {clock(now.toISOString(), settings)}  现在
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {!seal ? (
        theme.visualTheme === 'jellyGlass' ? (
          <LiquidGlassSurface
            borderRadius={jellyTabLayout.islandRadius}
            style={[styles.tickIsland, styles.tickIslandJelly]}
          >
            <View style={styles.tickIslandContent}>{tickIslandBody}</View>
          </LiquidGlassSurface>
        ) : (
          <BlurView
            intensity={theme.glassBlur * 4}
            tint={theme.mode === 'dark' ? 'dark' : 'light'}
            style={styles.tickIsland}
          >
            {tickIslandBody}
          </BlurView>
        )
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setComposerExpanded(false)}
        presentationStyle="pageSheet"
        visible={composerExpanded}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.editorPage}
        >
          <View style={styles.editorHeader}>
            <Pressable
              accessibilityLabel="关闭"
              accessibilityRole="button"
              onPress={() => setComposerExpanded(false)}
              style={styles.headerAction}
            >
              <SymbolIcon
                color={theme.text2}
                name="xmark"
                size={typography.scale.bodyLg.size}
              />
            </Pressable>
            <Text style={styles.sectionTitle}>装进一颗胶囊</Text>
            <View style={styles.headerAction} />
          </View>
          <TextInput
            accessibilityLabel="记录摘要"
            autoFocus
            maxLength={200}
            multiline
            onChangeText={setDraft}
            placeholder="这段时间在做什么…"
            placeholderTextColor={theme.text3}
            style={styles.editorInput}
            value={draft}
          />
          <View style={styles.allTags}>
            {tags.map((tag) => (
              <Pressable
                accessibilityLabel={`记录${tag.name}`}
                accessibilityRole="button"
                disabled={isSaving}
                key={tag.id}
                onPress={() => void saveNew(tag.id)}
                style={({ pressed }) => [
                  styles.sheetTag,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolIcon
                  color={tag.color}
                  name={symbolForTagName(tag.name)}
                  size={typography.scale.body.size}
                />
                <Text style={styles.sheetTagText}>
                  {tag.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {draft.trim() ? (
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void saveNew()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>记录这一刻</Text>
            </Pressable>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeEditor}
        presentationStyle="pageSheet"
        visible={editing !== null}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.editorPage}
        >
          <View style={styles.editorHeader}>
            <Pressable
              accessibilityLabel="关闭"
              accessibilityRole="button"
              onPress={closeEditor}
              style={styles.headerAction}
            >
              <SymbolIcon
                color={theme.text2}
                name="xmark"
                size={typography.scale.bodyLg.size}
              />
            </Pressable>
            <Text style={styles.sectionTitle}>编辑记录</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void saveEdit()}
              style={styles.headerAction}
            >
              <Text style={styles.headerActionStrong}>完成</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="修改记录摘要"
            autoFocus
            maxLength={200}
            multiline
            onChangeText={setEditSummary}
            onEndEditing={() => void saveEdit(false)}
            placeholder="写几个字也可以"
            placeholderTextColor={theme.text3}
            style={styles.editorInput}
            value={editSummary}
          />
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>删除这条记录</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeSeal}
        presentationStyle="pageSheet"
        visible={sealPreview !== null}
      >
        <View style={styles.sealPage}>
          {sealStep === 'replay' && sealPreview ? (
            <View style={styles.sealCenter}>
              <Text style={styles.eyebrow}>
                这是你的 {shortDate(sealPreview.date)}
              </Text>
              <Text style={styles.sealHero}>
                {sealPreview.capsuleCount} 颗胶囊，已经串成一天
              </Text>
              <Pressable
                accessibilityLabel="查看本地复盘"
                accessibilityRole="button"
                onPress={showSealReview}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>查看本地复盘</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={closeSeal}
                style={styles.headerAction}
              >
                <Text style={styles.headerActionText}>暂不封存</Text>
              </Pressable>
            </View>
          ) : null}

          {sealStep === 'review' && sealPreview ? (
            <ScrollView contentContainerStyle={styles.sealContent}>
              <View style={styles.editorHeader}>
                <Text style={styles.sectionTitle}>{sealPreview.date} · 复盘</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={closeSeal}
                  style={styles.headerAction}
                >
                  <Text style={styles.headerActionText}>取消</Text>
                </Pressable>
              </View>
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>本地生成 · 可离线使用</Text>
              </View>
              <View style={styles.reviewCard}>
                <ReviewContent content={sealPreview.contentMd} />
              </View>
              <TextInput
                accessibilityLabel="今日一句话"
                maxLength={2000}
                multiline
                onChangeText={setSealNote}
                placeholder="补一笔：给今天留一句自己的话"
                placeholderTextColor={theme.text3}
                style={styles.editorInput}
                value={sealNote}
              />
              <Pressable
                accessibilityLabel="确认封存今日"
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => void confirmSeal()}
                style={({ pressed }) => [
                  styles.sealButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving ? '正在封存…' : '确认封存'}
                </Text>
              </Pressable>
            </ScrollView>
          ) : null}

          {sealStep === 'done' ? (
            <View style={styles.sealCenter}>
              <Text style={styles.sealHero}>
                {shortDate(today)}，安放好了。
              </Text>
              <Text style={styles.streakText}>连续第 {sealedStreak} 天。</Text>
              <Pressable
                accessibilityLabel="完成封存"
                accessibilityRole="button"
                onPress={closeSeal}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>完成</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeBackfill}
        presentationStyle="pageSheet"
        visible={backfill !== null}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.editorPage}
        >
          <View style={styles.editorHeader}>
            <Pressable
              accessibilityRole="button"
              onPress={closeBackfill}
              style={styles.headerAction}
            >
              <Text style={styles.headerActionText}>取消</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>补记空隙</Text>
            <View style={styles.headerAction} />
          </View>
          {backfill ? (
            <Text style={styles.backfillRange}>
              {clock(backfill.startAt, settings)}–{clock(backfill.endAt, settings)}
              {' · '}
              {backfill.minutes} 分钟
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="补记摘要"
            maxLength={200}
            multiline
            onChangeText={setBackfillSummary}
            placeholder="这段时间发生了什么？"
            placeholderTextColor={theme.text3}
            style={styles.editorInput}
            value={backfillSummary}
          />
          <View style={styles.backfillTags}>
            {tags.map((tag) => (
              <Pressable
                accessibilityLabel={`补记为${tag.name}`}
                accessibilityRole="button"
                disabled={isSaving}
                key={tag.id}
                onPress={() => void saveBackfill(tag.id)}
                style={({ pressed }) => [
                  styles.backfillTag,
                  { borderColor: tag.color },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolIcon
                  color={tag.color}
                    name={symbolForTagName(tag.name)}
                  size={typography.scale.body.size}
                />
                <Text style={styles.tagButtonText}>{tag.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityLabel="无标签补记"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void saveBackfill()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>无标签补记</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

function createStyles(theme: NativeTheme) {
  const jellyMaterial = jellyGlassMaterials[theme.mode]
  return StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  auroraTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: capsuleHeight.max * 2,
    backgroundColor: theme.primarySoft,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
  },
  content: {
    paddingTop: spacing[6],
    paddingHorizontal: timelineLayout.screenPadding,
    paddingBottom: timelineLayout.tickIslandMinHeight + spacing[6] * 3,
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  title: {
    color: theme.text1,
    fontFamily:
      theme.visualTheme === 'jellyGlass'
        ? themeTypography.jellyGlass.displayFamily
        : undefined,
    fontSize: typography.scale.display.size,
    lineHeight: typography.scale.display.lineHeight,
    letterSpacing:
      theme.visualTheme === 'jellyGlass'
        ? themeTypography.jellyGlass.displayTracking
        : undefined,
    fontWeight: themeTypography[theme.visualTheme].displayWeight,
  },
  eyebrow: {
    color: theme.primary,
    fontSize: typography.scale.micro.size,
    lineHeight: typography.scale.micro.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
  },
  daySummary: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontVariant: ['tabular-nums'],
  },
  sealPill: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    gap: spacing[1],
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
  },
  sealPillPressable: {
    minWidth: capsuleHeight.min + spacing[5],
  },
  sealPillJelly: {
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: withAlpha(theme.bg, 0),
  },
  sealGlass: {
    flex: 1,
    minHeight: capsuleHeight.min,
  },
  sealPillContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[1],
  },
  sealPillText: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
  },
  countBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: theme.surface2,
  },
  countText: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
  },
  composer: {
    overflow: 'hidden',
    padding: spacing[3],
    gap: spacing[2],
    borderRadius: radius.capsule,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
    backgroundColor: theme.glassBg,
  },
  sealedNotice: {
    padding: spacing[3],
    gap: spacing[1],
    borderRadius: theme.capsuleRadius,
    backgroundColor: theme.surface,
  },
  input: {
    minHeight: capsuleHeight.min,
    color: theme.text1,
    fontSize: typography.scale.bodyLg.size,
    lineHeight: typography.scale.bodyLg.lineHeight,
  },
  tagRow: {
    gap: spacing[1],
  },
  tagButton: {
    minHeight: capsuleHeight.min,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.surface,
  },
  tagButtonText: {
    color: theme.text1,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: typography.scale.micro.weight,
  },
  primaryButton: {
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.input,
    backgroundColor: theme.primary,
  },
  primaryButtonText: {
    color: theme.surface,
    fontSize: typography.scale.bodyLg.size,
    lineHeight: typography.scale.bodyLg.lineHeight,
    fontWeight: typography.scale.title.weight,
  },
  sealButton: {
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: theme.primary,
  },
  disabled: {
    opacity: theme.disabledOpacity,
  },
  feedback: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    textAlign: 'center',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.text1,
    fontSize: typography.scale.title.size,
    lineHeight: typography.scale.title.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].titleWeight,
  },
  caption: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
  },
  timeline: {
    gap: spacing[1],
  },
  timelineRow: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: timelineLayout.timeToRailGap,
  },
  railColumn: {
    position: 'relative',
    width: timelineLayout.railColumn,
    alignItems: 'center',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
  },
  nodeGlow: {
    position: 'absolute',
    top: spacing[2] - spacing[1],
    width: timelineLayout.nodeSize + spacing[2],
    height: timelineLayout.nodeSize + spacing[2],
    borderRadius: radius.pill,
  },
  node: {
    position: 'absolute',
    top: spacing[2],
    width: timelineLayout.nodeSize,
    height: timelineLayout.nodeSize,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.bg,
  },
  gapNode: {
    position: 'absolute',
    top: spacing[2],
    width: timelineLayout.nodeSize,
    height: timelineLayout.nodeSize,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  gap: {
    minHeight: capsuleHeight.min + spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: theme.border,
    backgroundColor: theme.surface2,
  },
  gapPressable: {
    flex: 1,
  },
  gapGlass: {
    flex: 1,
    minHeight: capsuleHeight.min + spacing[3],
  },
  gapContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  gapText: {
    color: theme.text2,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
  },
  capsule: {
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: theme.capsuleRadius,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: spacing[1] },
    shadowRadius: spacing[4],
  },
  capsulePressable: {
    flex: 1,
  },
  jellyCapsuleSurface: {
    flex: 1,
  },
  jellyCapsuleContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  time: {
    width: timelineLayout.timeColumn,
    paddingTop: spacing[1],
    color: theme.text3,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
    fontVariant: ['tabular-nums'],
  },
  capsuleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  capsuleIcon: {
    width: capsuleHeight.min,
    height: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  capsuleCopy: {
    flex: 1,
    gap: spacing[0],
  },
  capsuleTitle: {
    color: theme.text1,
    fontSize: typography.scale.bodyLg.size,
    lineHeight: typography.scale.title.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
  },
  summary: {
    color: theme.text2,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
  },
  duration: {
    alignSelf: 'flex-start',
    paddingTop: spacing[1],
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[6],
    borderRadius: theme.capsuleRadius,
    backgroundColor: theme.surface2,
  },
  emptyIcon: {
    width: capsuleHeight.max / 2,
    height: capsuleHeight.max / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: theme.primarySoft,
  },
  emptyTitle: {
    color: theme.text1,
    fontSize: typography.scale.bodyLg.size,
    lineHeight: typography.scale.bodyLg.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].titleWeight,
  },
  nowRow: {
    position: 'relative',
    height: capsuleHeight.min,
    justifyContent: 'center',
  },
  nowLine: {
    position: 'absolute',
    left:
      timelineLayout.timeColumn +
      timelineLayout.timeToRailGap +
      timelineLayout.nodeSize / 2,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.primary,
  },
  nowNode: {
    position: 'absolute',
    left:
      timelineLayout.timeColumn +
      timelineLayout.timeToRailGap +
      (timelineLayout.railColumn - timelineLayout.nowNodeSize) / 2,
    width: timelineLayout.nowNodeSize,
    height: timelineLayout.nowNodeSize,
    borderRadius: radius.pill,
    backgroundColor: theme.primary,
  },
  nowText: {
    position: 'absolute',
    right: 0,
    paddingLeft: spacing[2],
    color: theme.primary,
    backgroundColor: theme.bg,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
    fontVariant: ['tabular-nums'],
  },
  tickIsland: {
    position: 'absolute',
    left: timelineLayout.tickIslandSide,
    right: timelineLayout.tickIslandSide,
    bottom:
      theme.visualTheme === 'jellyGlass'
        ? jellyTabLayout.bottom +
          jellyTabLayout.height +
          jellyTabLayout.islandGap
        : timelineLayout.tickIslandToTab,
    minHeight: timelineLayout.tickIslandMinHeight,
    overflow: 'hidden',
    padding: spacing[2],
    gap: spacing[2],
    borderRadius: radius.island,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassBorder,
    backgroundColor: theme.glassBg,
    shadowColor: theme.text1,
    shadowOffset: { width: 0, height: -spacing[1] },
    shadowOpacity: theme.capsuleShadowAlpha,
    shadowRadius: spacing[4],
  },
  tickIslandJelly: {
    overflow: 'visible',
    padding: 0,
    borderWidth: 0,
    backgroundColor: withAlpha(theme.bg, 0),
  },
  tickIslandContent: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[2],
  },
  quickTagRow: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    gap: spacing[1],
  },
  quickTag: {
    flex: 1,
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    borderRadius: radius.pill,
    borderWidth:
      theme.visualTheme === 'jellyGlass'
        ? StyleSheet.hairlineWidth
        : 0,
    borderColor: jellyMaterial.innerEdge,
    backgroundColor:
      theme.visualTheme === 'jellyGlass'
        ? jellyMaterial.input
        : theme.surface2,
  },
  quickTagText: {
    color: theme.text1,
    fontSize: typography.scale.caption.size,
    lineHeight: typography.scale.caption.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
  },
  moreTag: {
    width: capsuleHeight.min,
    height: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth:
      theme.visualTheme === 'jellyGlass'
        ? StyleSheet.hairlineWidth
        : 0,
    borderColor: jellyMaterial.innerEdge,
    backgroundColor:
      theme.visualTheme === 'jellyGlass'
        ? jellyMaterial.input
        : theme.surface2,
  },
  composerRow: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  composerInput: {
    flex: 1,
    minHeight: capsuleHeight.min,
    paddingHorizontal: spacing[3],
    borderRadius: radius.input,
    borderWidth:
      theme.visualTheme === 'jellyGlass'
        ? StyleSheet.hairlineWidth
        : 0,
    borderColor: jellyMaterial.innerEdge,
    color: theme.text1,
    backgroundColor:
      theme.visualTheme === 'jellyGlass'
        ? jellyMaterial.input
        : theme.surface2,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
  },
  tickButtonWrap: {
    width: capsuleHeight.min,
    height: capsuleHeight.min,
    borderRadius: radius.pill,
  },
  tickButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  allTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  sheetTag: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: theme.surface2,
  },
  sheetTagText: {
    color: theme.text1,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
  },
  pressed: {
    opacity: theme.pressedOpacity,
  },
  editorPage: {
    flex: 1,
    padding: spacing[3],
    gap: spacing[3],
    backgroundColor: theme.bg,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
  },
  headerAction: {
    minWidth: capsuleHeight.min,
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    color: theme.text2,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
  },
  headerActionStrong: {
    color: theme.primary,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
    fontWeight: typography.scale.title.weight,
  },
  editorInput: {
    minHeight: capsuleHeight.max,
    padding: spacing[3],
    borderRadius: radius.input,
    color: theme.text1,
    backgroundColor: theme.surface,
    fontSize: typography.scale.bodyLg.size,
    lineHeight: typography.scale.bodyLg.lineHeight,
    textAlignVertical: 'top',
  },
  deleteButton: {
    minHeight: capsuleHeight.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: presetTags[6]!.color,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
  },
  backfillRange: {
    color: theme.text2,
    fontSize: typography.scale.body.size,
    lineHeight: typography.scale.body.lineHeight,
    textAlign: 'center',
  },
  backfillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  backfillTag: {
    minHeight: capsuleHeight.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    gap: spacing[1],
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.surface,
  },
  sealPage: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  sealCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  sealHero: {
    color: theme.text1,
    fontSize: typography.scale.display.size,
    lineHeight: typography.scale.display.lineHeight,
    fontWeight: typography.scale.display.weight,
    textAlign: 'center',
  },
  sealContent: {
    padding: spacing[3],
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  localBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: theme.primarySoft,
  },
  localBadgeText: {
    color: theme.primary,
    fontSize: typography.scale.micro.size,
    lineHeight: typography.scale.micro.lineHeight,
    fontWeight: typography.scale.micro.weight,
  },
  reviewCard: {
    padding: spacing[3],
    borderRadius: radius.capsule,
    backgroundColor: theme.surface,
  },
  streakText: {
    color: theme.primary,
    fontSize: typography.scale.title.size,
    lineHeight: typography.scale.title.lineHeight,
    fontWeight: typography.scale.title.weight,
  },
})
}
