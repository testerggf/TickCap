import { useCallback, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import type { AiReportEntity } from '@tickcap/api'
import {
  capsuleHeight,
  radius,
  spacing,
  themeTypography,
  typography,
  type NativeTheme,
} from '@tickcap/tokens'
import { ReviewContent } from '../../src/components/review-content'
import { ScreenScaffold } from '../../src/components/screen-scaffold'
import { listDailyReports } from '../../src/data/repositories/seal-repository'
import { trackEvent } from '../../src/data/repositories/event-repository'
import { SymbolIcon } from '../../src/ui/symbol-icon'
import { useTickCapTheme } from '../../src/ui/theme-provider'

function displayDate(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}月${day}日`
}

function reportPreview(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '· ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export default function ReportsScreen() {
  const db = useSQLiteContext()
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [reports, setReports] = useState<AiReportEntity[]>([])
  const [selected, setSelected] = useState<AiReportEntity | null>(null)

  useFocusEffect(
    useCallback(() => {
      void listDailyReports(db).then(setReports)
    }, [db]),
  )

  return (
    <>
      <ScreenScaffold eyebrow="看看时间留下了什么" title="报告">
        {reports.length === 0 ? (
          <View style={styles.card}>
            <View style={styles.reportIcon}>
              <SymbolIcon
                color={theme.primary}
                name="doc.text"
                size={typography.scale.title.size}
              />
            </View>
            <Text style={styles.title}>日复盘从封存开始</Text>
            <Text style={styles.body}>
              安放好一天后，这里会留下可编辑的复盘。
            </Text>
          </View>
        ) : (
          reports.map((report) => (
            <Pressable
              accessibilityLabel={`查看 ${report.period_start} 的日复盘`}
              accessibilityRole="button"
              key={report.id}
              onPress={() => {
                setSelected(report)
                void trackEvent(db, 'report_view', {
                  type: report.type,
                  scroll_pct: 0,
                })
              }}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.reportIcon}>
                  <SymbolIcon
                    color={theme.primary}
                    name="doc.text"
                    size={typography.scale.bodyLg.size}
                  />
                </View>
                <View style={styles.reportCopy}>
                  <Text style={styles.title}>
                    {displayDate(report.period_start)}
                  </Text>
                  <Text style={styles.meta}>日复盘 · 本地生成</Text>
                </View>
                <SymbolIcon
                  color={theme.text3}
                  name="chevron.right"
                  size={typography.scale.caption.size}
                />
              </View>
              <Text numberOfLines={3} style={styles.body}>
                {reportPreview(
                  report.edited_md ?? report.content_md ?? '',
                )}
              </Text>
            </Pressable>
          ))
        )}
      </ScreenScaffold>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelected(null)}
        presentationStyle="pageSheet"
        visible={selected !== null}
      >
        <ScrollView contentContainerStyle={styles.detail}>
          <View style={styles.header}>
            <View>
              <Text style={styles.meta}>日复盘</Text>
              <Text style={styles.detailTitle}>
                {selected ? displayDate(selected.period_start) : ''}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="完成"
              accessibilityRole="button"
              onPress={() => setSelected(null)}
              style={styles.close}
            >
              <SymbolIcon
                color={theme.text2}
                name="xmark"
                size={typography.scale.bodyLg.size}
              />
            </Pressable>
          </View>
          {selected?.content_md ? (
            <View style={styles.readingSurface}>
              <ReviewContent
                content={selected.edited_md ?? selected.content_md}
              />
            </View>
          ) : null}
        </ScrollView>
      </Modal>
    </>
  )
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    card: {
      padding: spacing[4],
      gap: spacing[3],
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.surface,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    reportIcon: {
      width: capsuleHeight.min,
      height: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.primarySoft,
    },
    reportCopy: {
      flex: 1,
    },
    title: {
      color: theme.text1,
      fontSize: typography.scale.bodyLg.size,
      lineHeight: typography.scale.bodyLg.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].capsuleTitleWeight,
    },
    detailTitle: {
      color: theme.text1,
      fontSize: typography.scale.display.size,
      lineHeight: typography.scale.display.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].displayWeight,
    },
    body: {
      color: theme.text2,
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lineHeight,
    },
    meta: {
      color: theme.text2,
      fontSize: typography.scale.caption.size,
      lineHeight: typography.scale.caption.lineHeight,
    },
    pressed: {
      opacity: theme.pressedOpacity,
    },
    detail: {
      flexGrow: 1,
      padding: spacing[3],
      paddingBottom: spacing[6],
      gap: spacing[3],
      backgroundColor: theme.bg,
    },
    header: {
      minHeight: capsuleHeight.min + spacing[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[2],
    },
    close: {
      width: capsuleHeight.min,
      height: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surface2,
    },
    readingSurface: {
      padding: spacing[4],
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.surface,
    },
  })
}
