import { useMemo, type PropsWithChildren, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  spacing,
  themeTypography,
  typography,
  type NativeTheme,
} from '@tickcap/tokens'
import { useTickCapTheme } from '../ui/theme-provider'

interface ScreenScaffoldProps extends PropsWithChildren {
  eyebrow: string
  title: string
  trailing?: ReactNode
}

export function ScreenScaffold({
  children,
  eyebrow,
  title,
  trailing,
}: ScreenScaffoldProps) {
  const { theme } = useTickCapTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          {trailing}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(theme: NativeTheme) {
  return StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingTop: spacing[3],
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  heading: {
    flex: 1,
  },
  eyebrow: {
    color: theme.primary,
    fontSize: typography.scale.micro.size,
    lineHeight: typography.scale.micro.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].microWeight,
  },
  title: {
    color: theme.text1,
    fontSize: typography.scale.display.size,
    lineHeight: typography.scale.display.lineHeight,
    fontWeight: themeTypography[theme.visualTheme].displayWeight,
  },
})
}
