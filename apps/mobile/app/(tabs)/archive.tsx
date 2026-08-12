import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { getLocalParts, type UserTimeSettings } from '@tickcap/core'
import {
  capsuleHeight,
  radius,
  spacing,
  themeTypography,
  typography,
  withAlpha,
  type NativeTheme,
} from '@tickcap/tokens'
import { ReviewContent } from '../../src/components/review-content'
import { ScreenScaffold } from '../../src/components/screen-scaffold'
import {
  getArchiveDayDetail,
  listRecordedDays,
  type ArchiveDayDetail,
  type RecordedDay,
} from '../../src/data/repositories/archive-repository'
import { trackEvent } from '../../src/data/repositories/event-repository'
import { unsealDay } from '../../src/data/repositories/seal-repository'
import { getTimeSettings } from '../../src/data/repositories/settings-repository'
import { SymbolIcon } from '../../src/ui/symbol-icon'
import { symbolForTagName } from '../../src/ui/tag-symbol'
import { useTickCapTheme } from '../../src/ui/theme-provider'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const

function clock(iso: string, settings: UserTimeSettings): string {
  const parts = getLocalParts(new Date(iso), settings.timezone)
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

function initialMonth(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number)
  return `${year}年${value}月`
}

function shiftMonth(month: string, delta: number): string {
  const [year, value] = month.split('-').map(Number)
  const shifted = new Date(year!, value! - 1 + delta, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`
}

function calendarCells(month: string): Array<number | null> {
  const [year, value] = month.split('-').map(Number)
  const firstWeekday = new Date(year!, value! - 1, 1).getDay()
  const mondayOffset = (firstWeekday + 6) % 7
  const count = new Date(year!, value!, 0).getDate()
  return [
    ...Array.from<null>({ length: mondayOffset }).fill(null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ]
}

function displayDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}月${day}日`
}

export default function ArchiveScreen() {
  const db = useSQLiteContext()
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [days, setDays] = useState<RecordedDay[]>([])
  const [detail, setDetail] = useState<ArchiveDayDetail | null>(null)
  const [settings, setSettings] = useState<UserTimeSettings | null>(null)
  const [month, setMonth] = useState(initialMonth)

  const refresh = useCallback(async () => {
    const [nextDays, nextSettings] = await Promise.all([
      listRecordedDays(db),
      getTimeSettings(db),
    ])
    setDays(nextDays)
    setSettings(nextSettings)
  }, [db])

  useEffect(() => {
    void refresh()
  }, [refresh])
  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const daysByDate = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  )
  const cells = useMemo(() => calendarCells(month), [month])

  const openDay = async (date: string) => {
    const next = await getArchiveDayDetail(db, date)
    setDetail(next)
    if (next.report) {
      await trackEvent(db, 'report_view', {
        type: 'daily',
        scroll_pct: 0,
      })
    }
  }

  const confirmUnseal = () => {
    if (!detail?.seal) return
    Alert.alert(
      '解封这一天？',
      '解封后记录和历史复盘都不会删除，可以再次封存。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '解封',
          onPress: () => {
            const date = detail.date
            void unsealDay(db, date)
              .then(() => getArchiveDayDetail(db, date))
              .then(setDetail)
              .then(refresh)
          },
        },
      ],
    )
  }

  return (
    <>
      <ScreenScaffold eyebrow="过去的每一天" title="档案馆">
        <View style={styles.calendar}>
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityLabel="上个月"
              accessibilityRole="button"
              onPress={() => setMonth((current) => shiftMonth(current, -1))}
              style={styles.monthButton}
            >
              <SymbolIcon
                color={theme.text2}
                name="chevron.left"
                size={typography.scale.body.size}
              />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
            <Pressable
              accessibilityLabel="下个月"
              accessibilityRole="button"
              onPress={() => setMonth((current) => shiftMonth(current, 1))}
              style={styles.monthButton}
            >
              <SymbolIcon
                color={theme.text2}
                name="chevron.right"
                size={typography.scale.body.size}
              />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((dayNumber, index) => {
              if (dayNumber === null) {
                return <View key={`blank:${index}`} style={styles.dayCell} />
              }
              const date = `${month}-${String(dayNumber).padStart(2, '0')}`
              const recorded = daysByDate.get(date)
              return (
                <Pressable
                  accessibilityLabel={
                    recorded
                      ? `${date}，${recorded.capsule_count}颗胶囊`
                      : `${date}，没有记录`
                  }
                  accessibilityRole={recorded ? 'button' : undefined}
                  disabled={!recorded}
                  key={date}
                  onPress={() => void openDay(date)}
                  style={styles.dayCell}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      recorded && styles.dayNumberRecorded,
                    ]}
                  >
                    {dayNumber}
                  </Text>
                  {recorded ? (
                    <View
                      style={[
                        styles.dayDot,
                        {
                          backgroundColor:
                            recorded.top_tag_color ?? theme.primary,
                          borderColor: recorded.streak
                            ? theme.text1
                            : 'transparent',
                        },
                      ]}
                    />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </View>

        {days.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>记录会在这里慢慢长出来</Text>
          </View>
        ) : (
          <View style={styles.recent}>
            <Text style={styles.sectionTitle}>最近的日子</Text>
            {days.slice(0, 3).map((day) => (
              <Pressable
                accessibilityLabel={`查看 ${day.date}，${day.capsule_count}颗胶囊`}
                accessibilityRole="button"
                key={day.date}
                onPress={() => void openDay(day.date)}
                style={({ pressed }) => [
                  styles.dayCard,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.recentDot,
                    {
                      backgroundColor:
                        day.top_tag_color ?? theme.primary,
                    },
                  ]}
                />
                <View style={styles.recentCopy}>
                  <Text style={styles.dayDate}>{displayDate(day.date)}</Text>
                  <Text style={styles.body}>
                    {day.capsule_count}颗胶囊
                    {day.streak ? ` · 连续第${day.streak}天` : ''}
                  </Text>
                </View>
                <SymbolIcon
                  color={theme.text3}
                  name="chevron.right"
                  size={typography.scale.caption.size}
                />
              </Pressable>
            ))}
          </View>
        )}
      </ScreenScaffold>

      <Modal
        animationType="slide"
        onRequestClose={() => setDetail(null)}
        presentationStyle="pageSheet"
        visible={detail !== null}
      >
        <ScrollView contentContainerStyle={styles.detail}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.eyebrow}>当日回看</Text>
              <Text style={styles.detailTitle}>
                {detail ? displayDate(detail.date) : ''}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="完成"
              accessibilityRole="button"
              onPress={() => setDetail(null)}
              style={styles.close}
            >
              <SymbolIcon
                color={theme.text2}
                name="xmark"
                size={typography.scale.bodyLg.size}
              />
            </Pressable>
          </View>

          {detail?.capsules.map((capsule) => {
            const tag = detail.tags.find(
              (candidate) => candidate.id === capsule.tag_ids[0],
            )
            const tagColor = tag?.color ?? theme.primary
            return (
              <View
                key={capsule.id}
                style={[
                  styles.capsule,
                  {
                    backgroundColor: withAlpha(
                      tagColor,
                      theme.capsuleTintAlpha,
                    ),
                    borderColor: withAlpha(
                      tagColor,
                      theme.capsuleBorderAlpha,
                    ),
                  },
                ]}
              >
                <View style={styles.capsuleHeading}>
                  <SymbolIcon
                    color={tagColor}
                    name={symbolForTagName(tag?.name)}
                    size={typography.scale.bodyLg.size}
                  />
                  <Text style={styles.capsuleTitle}>
                    {capsule.summary?.trim() || tag?.name || '这一刻'}
                  </Text>
                </View>
                <Text style={styles.time}>
                  {settings ? clock(capsule.start_at, settings) : ''}
                  {'–'}
                  {settings ? clock(capsule.end_at, settings) : ''}
                </Text>
                {capsule.detail ? (
                  <Text style={styles.detailBody}>{capsule.detail}</Text>
                ) : null}
              </View>
            )
          })}

          {detail?.seal ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                已封存 · 连续第{detail.seal.streak}天
              </Text>
              {detail.seal.note ? (
                <Text style={styles.body}>{detail.seal.note}</Text>
              ) : null}
            </View>
          ) : null}

          {detail?.report?.content_md ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>当日复盘</Text>
              <ReviewContent
                content={
                  detail.report.edited_md ?? detail.report.content_md
                }
              />
            </View>
          ) : null}

          {detail?.seal ? (
            <Pressable
              accessibilityRole="button"
              onPress={confirmUnseal}
              style={({ pressed }) => [
                styles.unsealButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.unsealText}>解封这一天</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </Modal>
    </>
  )
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    calendar: {
      padding: spacing[3],
      gap: spacing[2],
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.surface,
    },
    monthHeader: {
      minHeight: capsuleHeight.min,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthButton: {
      width: capsuleHeight.min,
      height: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surface2,
    },
    monthTitle: {
      color: theme.text1,
      fontSize: typography.scale.title.size,
      lineHeight: typography.scale.title.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].titleWeight,
    },
    weekRow: {
      flexDirection: 'row',
    },
    weekday: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      color: theme.text3,
      fontSize: typography.scale.micro.size,
      lineHeight: typography.scale.micro.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].microWeight,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      minHeight: capsuleHeight.min + spacing[1],
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1],
    },
    dayNumber: {
      color: theme.text3,
      fontSize: typography.scale.caption.size,
      lineHeight: typography.scale.caption.lineHeight,
      fontVariant: ['tabular-nums'],
    },
    dayNumberRecorded: {
      color: theme.text1,
      fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
    },
    dayDot: {
      width: spacing[2],
      height: spacing[2],
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
    },
    empty: {
      padding: spacing[4],
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.surface,
    },
    emptyTitle: {
      color: theme.text1,
      fontSize: typography.scale.bodyLg.size,
      lineHeight: typography.scale.bodyLg.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
    },
    recent: {
      gap: spacing[2],
    },
    sectionTitle: {
      color: theme.text1,
      fontSize: typography.scale.title.size,
      lineHeight: typography.scale.title.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].titleWeight,
    },
    dayCard: {
      minHeight: capsuleHeight.min + spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing[3],
      gap: spacing[2],
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.surface,
    },
    recentDot: {
      width: spacing[2],
      height: spacing[6],
      borderRadius: radius.pill,
    },
    recentCopy: {
      flex: 1,
      gap: spacing[0],
    },
    dayDate: {
      color: theme.text1,
      fontSize: typography.scale.bodyLg.size,
      lineHeight: typography.scale.bodyLg.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
    },
    body: {
      color: theme.text2,
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lineHeight,
    },
    pressed: {
      opacity: theme.pressedOpacity,
    },
    detail: {
      padding: spacing[3],
      paddingBottom: spacing[6],
      gap: spacing[3],
      backgroundColor: theme.bg,
    },
    detailHeader: {
      minHeight: capsuleHeight.min + spacing[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[2],
    },
    eyebrow: {
      color: theme.primary,
      fontSize: typography.scale.micro.size,
      lineHeight: typography.scale.micro.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].microWeight,
    },
    detailTitle: {
      color: theme.text1,
      fontSize: typography.scale.display.size,
      lineHeight: typography.scale.display.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].displayWeight,
    },
    close: {
      width: capsuleHeight.min,
      height: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surface2,
    },
    capsule: {
      padding: spacing[3],
      gap: spacing[1],
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.capsuleRadius,
    },
    capsuleHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    time: {
      color: theme.text3,
      fontSize: typography.scale.caption.size,
      lineHeight: typography.scale.caption.lineHeight,
      fontVariant: ['tabular-nums'],
    },
    capsuleTitle: {
      flex: 1,
      color: theme.text1,
      fontSize: typography.scale.bodyLg.size,
      lineHeight: typography.scale.bodyLg.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
    },
    detailBody: {
      color: theme.text2,
      fontSize: typography.scale.caption.size,
      lineHeight: typography.scale.caption.lineHeight,
    },
    section: {
      padding: spacing[3],
      gap: spacing[2],
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.surface,
    },
    unsealButton: {
      minHeight: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surface2,
    },
    unsealText: {
      color: theme.text2,
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].microWeight,
    },
  })
}
