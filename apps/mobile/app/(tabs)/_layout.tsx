import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import {
  jellyTabLayout,
  radius,
  spacing,
  themeTypography,
  typography,
  withAlpha,
} from '@tickcap/tokens'
import { StyleSheet, View } from 'react-native'
import { LiquidGlassSurface } from '../../src/ui/liquid-glass-surface'
import { SymbolIcon } from '../../src/ui/symbol-icon'
import { useTickCapTheme } from '../../src/ui/theme-provider'

export default function TabLayout() {
  const { theme } = useTickCapTheme()
  const isJelly = theme.visualTheme === 'jellyGlass'
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.text3,
        tabBarStyle: {
          backgroundColor: isJelly
            ? withAlpha(theme.bg, 0)
            : theme.glassBg,
          borderTopColor: isJelly
            ? withAlpha(theme.bg, 0)
            : theme.border,
          ...(isJelly
            ? {
                position: 'absolute' as const,
                left: jellyTabLayout.side,
                right: jellyTabLayout.side,
                bottom: jellyTabLayout.bottom,
                height: jellyTabLayout.height,
                borderRadius: jellyTabLayout.radius,
                borderTopWidth: 0,
              }
            : {}),
          paddingTop: spacing[1],
        },
        tabBarBackground: isJelly
          ? () => (
              <LiquidGlassSurface
                borderRadius={jellyTabLayout.radius}
                style={StyleSheet.absoluteFill}
                variant="tab"
              />
            )
          : undefined,
        tabBarLabelStyle: {
          fontSize: typography.scale.micro.size,
          lineHeight: typography.scale.micro.lineHeight,
          fontWeight: themeTypography[theme.visualTheme].microWeight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '今日',
          tabBarIcon: ({ color, focused, size }) => (
            <TabSymbol
              color={color}
              focused={focused}
              name={focused ? 'clock.fill' : 'clock'}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: '档案',
          tabBarIcon: ({ color, focused, size }) => (
            <TabSymbol
              color={color}
              focused={focused}
              name={focused ? 'archivebox.fill' : 'archivebox'}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: '报告',
          tabBarIcon: ({ color, focused, size }) => (
            <TabSymbol
              color={color}
              focused={focused}
              name={focused ? 'chart.bar.fill' : 'chart.bar'}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused, size }) => (
            <TabSymbol
              color={color}
              focused={focused}
              name={focused ? 'person.fill' : 'person'}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  )
}

function TabSymbol({
  color,
  focused,
  name,
  size,
}: {
  color: string
  focused: boolean
  name: ComponentProps<typeof SymbolIcon>['name']
  size: number
}) {
  const { theme } = useTickCapTheme()
  if (theme.visualTheme !== 'jellyGlass' || !focused) {
    return <SymbolIcon color={color} name={name} size={size} />
  }
  return (
    <LinearGradient
      colors={[theme.actionStart, theme.actionEnd]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.activeIcon}
    >
      <SymbolIcon color={theme.surface} name={name} size={size} />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  activeIcon: {
    width: spacing[6] + spacing[0],
    height: spacing[6] + spacing[0],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
})
