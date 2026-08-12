import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  capsuleHeight,
  presetTags,
  radius,
  spacing,
  themeTypography,
  typography,
  type NativeTheme,
} from '@tickcap/tokens'
import { createCapsule } from '../src/data/repositories/capsule-repository'
import { trackEvent } from '../src/data/repositories/event-repository'
import {
  completeOnboarding,
  DEFAULT_ONBOARDING_PREFERENCES,
} from '../src/data/repositories/onboarding-repository'
import { getTimeSettings } from '../src/data/repositories/settings-repository'
import { AuroraBackground } from '../src/ui/aurora-background'
import { SymbolIcon } from '../src/ui/symbol-icon'
import { useTickCapTheme } from '../src/ui/theme-provider'

const FIRST_TICKS = [
  {
    key: 'wake',
    label: '刚起床',
    symbol: 'sun.max.fill',
    tagId: null,
    summary: '刚起床',
  },
  {
    key: 'slack',
    label: '正在摸鱼',
    symbol: 'cloud.fill',
    tagId: presetTags.find((tag) => tag.key === 'slack')?.entityId ?? null,
    summary: null,
  },
  {
    key: 'muse',
    label: '随便看看',
    symbol: 'eye.fill',
    tagId: presetTags.find((tag) => tag.key === 'muse')?.entityId ?? null,
    summary: null,
  },
] as const

type ReminderInterval = 30 | 60 | 120

function minuteClock(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function shiftedMinute(value: number, delta: number): number {
  return (value + delta + 24 * 60) % (24 * 60)
}

export default function OnboardingScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [reminderInterval, setReminderInterval] =
    useState<ReminderInterval>(
      DEFAULT_ONBOARDING_PREFERENCES.reminder_interval_min,
    )
  const [sealReminderMin, setSealReminderMin] = useState(
    DEFAULT_ONBOARDING_PREFERENCES.seal_reminder_min,
  )

  const advanceToFirstTick = async () => {
    await Haptics.selectionAsync()
    await trackEvent(db, 'onboarding_step', { step: 1 })
    setStep(2)
  }

  const firstTick = async (choice: (typeof FIRST_TICKS)[number]) => {
    if (isSaving) return
    setIsSaving(true)
    setFeedback('')
    try {
      const settings = await getTimeSettings(db)
      const startedAt = Date.now()
      await trackEvent(db, 'record_start', { entry: 'tickbar' })
      await createCapsule(
        db,
        {
          summary: choice.summary,
          tagIds: choice.tagId ? [choice.tagId] : [],
          source: 'onboarding',
          recordEntry: 'onboarding',
          elapsedMs: Date.now() - startedAt,
          onboardingFirstTag: choice.key,
        },
        settings,
      )
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      )
      setFeedback('已挂上你的时间轴')
      setStep(3)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时没记下来，请再试一次')
    } finally {
      setIsSaving(false)
    }
  }

  const finish = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await completeOnboarding(db, {
        reminder_interval_min: reminderInterval,
        seal_reminder_min: sealReminderMin,
      })
      await Haptics.selectionAsync()
      router.replace('/')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '暂时无法保存偏好')
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.page}>
      <AuroraBackground />

      {step === 1 ? (
        <View style={styles.center}>
          <View
            accessible
            accessibilityLabel="三颗时间胶囊挂在时间轴上"
            style={styles.demo}
          >
            <View style={styles.demoRail} />
            <View style={styles.demoRow}>
              <Text style={styles.demoTime}>08:30</Text>
              <View style={[styles.demoNode, styles.demoNodeRose]} />
              <View style={[styles.demoCapsule, styles.demoCapsuleRose]}>
                <SymbolIcon color={theme.text1} name="cup.and.saucer.fill" size={16} />
              </View>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoTime}>09:00</Text>
              <View style={[styles.demoNode, styles.demoNodeBlue]} />
              <View style={[styles.demoCapsule, styles.demoCapsuleLong]}>
                <SymbolIcon color={theme.text1} name="briefcase.fill" size={16} />
              </View>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoTime}>11:20</Text>
              <View style={[styles.demoNode, styles.demoNodeGreen]} />
              <View style={[styles.demoCapsule, styles.demoCapsuleGreen]}>
                <SymbolIcon color={theme.text1} name="figure.walk" size={16} />
              </View>
            </View>
          </View>
          <Text style={styles.title}>把每一刻装进胶囊</Text>
          <Text style={styles.body}>回头看时，一天会重新变得清晰。</Text>
          <PrimaryButton
            label="开始"
            onPress={() => void advanceToFirstTick()}
            theme={theme}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.center}>
          <Text style={styles.title}>你现在在做什么？</Text>
          <Text style={styles.body}>点一下，装进今天的第一颗胶囊。</Text>
          <View style={styles.choiceList}>
            {FIRST_TICKS.map((choice) => (
              <Pressable
                accessible
                accessibilityLabel={choice.label}
                accessibilityRole="button"
                disabled={isSaving}
                key={choice.key}
                onPress={() => void firstTick(choice)}
                style={({ pressed }) => [
                  styles.choice,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.choiceIcon}>
                  <SymbolIcon color={theme.primary} name={choice.symbol} size={20} />
                </View>
                <Text style={styles.choiceText}>{choice.label}</Text>
                <SymbolIcon color={theme.text3} name="chevron.right" size={14} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.center}>
          <Text style={styles.title}>什么时候轻轻提醒你？</Text>
          <Text style={styles.body}>先保存偏好，需要时再开启通知。</Text>

          <View style={styles.preferenceCard}>
            <View style={styles.preferenceHeading}>
              <SymbolIcon color={theme.primary} name="bell.fill" size={18} />
              <Text style={styles.preferenceTitle}>记录间隔</Text>
            </View>
            <View style={styles.segmentRow}>
              {([30, 60, 120] as const).map((minutes) => (
                <Pressable
                  accessible
                  accessibilityLabel={`每${minutes}分钟提醒`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: reminderInterval === minutes }}
                  key={minutes}
                  onPress={() => setReminderInterval(minutes)}
                  style={[
                    styles.segment,
                    reminderInterval === minutes && styles.segmentSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      reminderInterval === minutes &&
                        styles.segmentTextSelected,
                    ]}
                  >
                    {minutes < 60 ? '30 分钟' : `${minutes / 60} 小时`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.preferenceCard}>
            <View style={styles.preferenceHeading}>
              <SymbolIcon color={theme.primary} name="archivebox.fill" size={18} />
              <Text style={styles.preferenceTitle}>晚间封存</Text>
            </View>
            <View style={styles.timeStepper}>
              <Pressable
                accessibilityLabel="封存提醒提前30分钟"
                accessibilityRole="button"
                onPress={() =>
                  setSealReminderMin((value) => shiftedMinute(value, -30))
                }
                style={styles.stepButton}
              >
                <SymbolIcon color={theme.primary} name="minus" size={15} />
              </Pressable>
              <Text style={styles.timeValue}>{minuteClock(sealReminderMin)}</Text>
              <Pressable
                accessibilityLabel="封存提醒推后30分钟"
                accessibilityRole="button"
                onPress={() =>
                  setSealReminderMin((value) => shiftedMinute(value, 30))
                }
                style={styles.stepButton}
              >
                <SymbolIcon color={theme.primary} name="plus" size={15} />
              </Pressable>
            </View>
          </View>

          <PrimaryButton
            disabled={isSaving}
            label="进入 TickCap"
            onPress={() => void finish()}
            theme={theme}
          />
        </View>
      ) : null}

      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      <View
        accessible
        accessibilityLabel={`第 ${step} 屏，共 3 屏`}
        style={styles.pageDots}
      >
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            style={[styles.dot, index === step && styles.dotSelected]}
          />
        ))}
      </View>
    </SafeAreaView>
  )
}

function PrimaryButton({
  disabled,
  label,
  onPress,
  theme,
}: {
  disabled?: boolean
  label: string
  onPress: () => void
  theme: NativeTheme
}) {
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButtonWrap,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[theme.actionStart, theme.actionEnd]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  )
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
    page: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[6],
      backgroundColor: theme.bg,
      overflow: 'hidden',
    },
    center: {
      alignItems: 'center',
      gap: spacing[4],
    },
    demo: {
      width: capsuleHeight.max * 2,
      gap: spacing[2],
      padding: spacing[4],
      borderRadius: radius.sheet,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.glassBorder,
      backgroundColor: theme.glassBg,
      overflow: 'hidden',
    },
    demoRail: {
      position: 'absolute',
      top: spacing[4],
      bottom: spacing[4],
      left: capsuleHeight.min + spacing[5],
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
    },
    demoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    demoTime: {
      width: capsuleHeight.min,
      color: theme.text3,
      fontSize: typography.scale.micro.size,
      lineHeight: typography.scale.micro.lineHeight,
      fontVariant: ['tabular-nums'],
      textAlign: 'right',
    },
    demoNode: {
      width: spacing[2],
      height: spacing[2],
      borderRadius: radius.pill,
      borderWidth: spacing[0],
      borderColor: theme.surface,
      zIndex: 1,
    },
    demoNodeRose: {
      backgroundColor: presetTags[0]?.color ?? theme.primary,
    },
    demoNodeBlue: {
      backgroundColor: presetTags[1]?.color ?? theme.primary,
    },
    demoNodeGreen: {
      backgroundColor: presetTags[2]?.color ?? theme.primary,
    },
    demoCapsule: {
      flex: 1,
      minHeight: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.capsuleRadius,
      backgroundColor: theme.primarySoft,
    },
    demoCapsuleLong: {
      minHeight: spacing[6] + spacing[3],
      backgroundColor: theme.surface2,
    },
    demoCapsuleRose: {
      backgroundColor: theme.primarySoft,
    },
    demoCapsuleGreen: {
      backgroundColor: theme.surface2,
    },
    title: {
      color: theme.text1,
      fontSize: typography.scale.display.size,
      lineHeight: typography.scale.display.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].displayWeight,
      textAlign: 'center',
    },
    body: {
      color: theme.text2,
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lineHeight,
      textAlign: 'center',
    },
    primaryButtonWrap: {
      width: '100%',
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    primaryButton: {
      minHeight: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[4],
    },
    primaryButtonText: {
      color: theme.surface,
      fontSize: typography.scale.bodyLg.size,
      lineHeight: typography.scale.bodyLg.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].titleWeight,
    },
    choiceList: {
      width: '100%',
      gap: spacing[2],
    },
    choice: {
      minHeight: capsuleHeight.min + spacing[2],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[3],
      borderRadius: theme.capsuleRadius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.glassBorder,
      backgroundColor: theme.glassBg,
    },
    choiceIcon: {
      width: spacing[6],
      height: spacing[6],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.primarySoft,
    },
    choiceText: {
      flex: 1,
      color: theme.text1,
      fontSize: typography.scale.bodyLg.size,
      lineHeight: typography.scale.bodyLg.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].titleWeight,
    },
    preferenceCard: {
      width: '100%',
      gap: spacing[3],
      padding: spacing[3],
      borderRadius: theme.capsuleRadius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.glassBorder,
      backgroundColor: theme.glassBg,
    },
    preferenceHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    preferenceTitle: {
      color: theme.text1,
      fontSize: typography.scale.body.size,
      lineHeight: typography.scale.body.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].titleWeight,
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
      fontWeight: themeTypography[theme.visualTheme].microWeight,
    },
    segmentTextSelected: {
      color: theme.surface,
    },
    timeStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[2],
    },
    stepButton: {
      width: capsuleHeight.min,
      height: capsuleHeight.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: theme.surface2,
    },
    timeValue: {
      color: theme.text1,
      fontSize: typography.scale.title.size,
      lineHeight: typography.scale.title.lineHeight,
      fontWeight: themeTypography[theme.visualTheme].displayWeight,
      fontVariant: ['tabular-nums'],
    },
    feedback: {
      marginTop: spacing[3],
      color: theme.primary,
      fontSize: typography.scale.caption.size,
      lineHeight: typography.scale.caption.lineHeight,
      textAlign: 'center',
    },
    pageDots: {
      position: 'absolute',
      bottom: spacing[6],
      alignSelf: 'center',
      flexDirection: 'row',
      gap: spacing[1],
    },
    dot: {
      width: spacing[1],
      height: spacing[1],
      borderRadius: radius.pill,
      backgroundColor: theme.border,
    },
    dotSelected: {
      backgroundColor: theme.primary,
    },
    pressed: {
      opacity: theme.pressedOpacity,
      transform: [{ scale: theme.pressScale }],
    },
  })
}
