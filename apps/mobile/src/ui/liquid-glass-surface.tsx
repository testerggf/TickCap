import type { PropsWithChildren } from 'react'
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { BlurView } from 'expo-blur'
import {
  GlassView,
  isLiquidGlassAvailable,
} from 'expo-glass-effect'
import { LinearGradient } from 'expo-linear-gradient'
import {
  capsuleHeight,
  jellyGlassMaterials,
  spacing,
  withAlpha,
} from '@tickcap/tokens'
import { useTickCapTheme } from './theme-provider'

interface LiquidGlassSurfaceProps extends PropsWithChildren {
  borderRadius?: number
  isInteractive?: boolean
  showRefractionBlob?: boolean
  style?: StyleProp<ViewStyle>
  tintColor?: string
  variant?: 'tinted' | 'neutral' | 'tab'
}

const nativeLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable()

export function LiquidGlassSurface({
  borderRadius,
  children,
  isInteractive = false,
  showRefractionBlob = false,
  style,
  tintColor,
  variant = 'neutral',
}: LiquidGlassSurfaceProps) {
  const { theme } = useTickCapTheme()
  const material = jellyGlassMaterials[theme.mode]
  const radius = borderRadius ?? theme.capsuleRadius
  const tone = tintColor ?? theme.primary
  const nativeTint =
    variant === 'tinted'
      ? withAlpha(tone, material.nativeTintAlpha)
      : variant === 'tab'
        ? material.tab
        : material.input
  const wash =
    variant === 'tinted'
      ? withAlpha(tone, theme.capsuleTintAlpha)
      : variant === 'tab'
        ? material.tab
        : material.input

  return (
    <View
      style={[
        styles.shadowFrame,
        {
          borderRadius: radius,
          shadowColor: tone,
          shadowOpacity: material.shadowOpacity,
          shadowRadius: material.shadowRadius,
        },
        style,
      ]}
    >
      <View style={[styles.clip, { borderRadius: radius }]}>
        {nativeLiquidGlass ? (
          <GlassView
            colorScheme={theme.mode}
            glassEffectStyle="clear"
            isInteractive={isInteractive}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tintColor={nativeTint}
          />
        ) : (
          <BlurView
            intensity={material.fallbackIntensity}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint={theme.mode === 'dark' ? 'dark' : 'light'}
          />
        )}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: wash }]}
        />
        <LinearGradient
          colors={[material.highlight, material.highlightSoft]}
          end={{ x: 0.75, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={[styles.topSheen, { opacity: material.sheenOpacity }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.innerEdge,
            {
              borderColor: material.innerEdge,
              borderRadius: radius,
              borderWidth: material.edgeWidth,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.topHighlight,
            {
              backgroundColor: material.highlight,
              height: material.highlightHeight,
              opacity: material.highlightOpacity,
            },
          ]}
        />
        {showRefractionBlob ? (
          <View
            pointerEvents="none"
            style={[
              styles.refractionBlob,
              {
                backgroundColor: material.highlightSoft,
                borderColor: material.innerEdge,
                borderWidth: material.edgeWidth,
                transform: [{ rotate: material.blobRotation }],
              },
            ]}
          />
        ) : null}
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadowFrame: {
    shadowOffset: { width: 0, height: spacing[2] },
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: capsuleHeight.min,
  },
  innerEdge: {
    ...StyleSheet.absoluteFillObject,
  },
  topHighlight: {
    position: 'absolute',
    top: spacing[1],
    left: spacing[4],
    right: spacing[4],
    borderRadius: capsuleHeight.min,
  },
  refractionBlob: {
    position: 'absolute',
    right: spacing[3],
    bottom: spacing[2],
    width: capsuleHeight.max - spacing[4],
    height: capsuleHeight.min,
    borderRadius: capsuleHeight.min,
  },
})
