import { StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import {
  auroraLayout,
  jellyBackgroundLayout,
  spacing,
  withAlpha,
} from '@tickcap/tokens'
import { useTickCapTheme } from './theme-provider'

export function AuroraBackground() {
  const { theme } = useTickCapTheme()
  const colors = theme.auroraColors
  if (theme.visualTheme === 'jellyGlass') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[
            theme.bg,
            withAlpha(colors[0], jellyBackgroundLayout.topTintAlpha),
            theme.bg,
            withAlpha(colors[3], jellyBackgroundLayout.bottomTintAlpha),
          ]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.jellyGlow,
            styles.jellyTop,
            { backgroundColor: colors[0] },
          ]}
        />
        <View
          style={[
            styles.jellyGlow,
            styles.jellyMiddle,
            { backgroundColor: colors[1] },
          ]}
        />
        <BlurView
          intensity={jellyBackgroundLayout.blurIntensity}
          style={StyleSheet.absoluteFill}
          tint={theme.mode === 'dark' ? 'dark' : 'light'}
        />
        <View
          style={[
            styles.wave,
            styles.waveRose,
            { borderColor: colors[2] },
          ]}
        />
        <View
          style={[
            styles.wave,
            styles.waveBlue,
            { borderColor: colors[3] },
          ]}
        />
      </View>
    )
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.glow,
          styles.topLeft,
          { backgroundColor: colors[0], opacity: theme.auroraOpacity },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.topRight,
          { backgroundColor: colors[1], opacity: theme.auroraOpacity },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.bottomLeft,
          {
            backgroundColor: colors[2],
            opacity:
              theme.auroraOpacity * auroraLayout.secondaryOpacityFactor,
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.bottomRight,
          {
            backgroundColor: colors[3],
            opacity:
              theme.auroraOpacity * auroraLayout.secondaryOpacityFactor,
          },
        ]}
      />
    </View>
  )
}

const glowSize = auroraLayout.glowSize

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: glowSize,
    height: glowSize,
    borderRadius: glowSize / 2,
    transform: [{ scaleX: auroraLayout.glowScaleX }],
  },
  topLeft: {
    top: -spacing[6] * 4,
    left: -spacing[6] * 4,
  },
  topRight: {
    top: spacing[6],
    right: -spacing[6] * 5,
  },
  bottomLeft: {
    bottom: spacing[6] * 3,
    left: -spacing[6] * 5,
  },
  bottomRight: {
    bottom: -spacing[6] * 3,
    right: -spacing[6] * 4,
  },
  jellyGlow: {
    position: 'absolute',
    width: jellyBackgroundLayout.glowSize,
    height: jellyBackgroundLayout.glowSize,
    borderRadius: jellyBackgroundLayout.glowSize / 2,
    opacity: jellyBackgroundLayout.topTintAlpha,
    transform: [{ scaleX: jellyBackgroundLayout.glowScaleX }],
  },
  jellyTop: {
    top: -jellyBackgroundLayout.glowSize / 2,
    left: -jellyBackgroundLayout.glowSize / 2,
  },
  jellyMiddle: {
    top: jellyBackgroundLayout.glowSize / 2,
    right: -jellyBackgroundLayout.glowSize / 2,
  },
  wave: {
    position: 'absolute',
    bottom: jellyBackgroundLayout.waveBottom,
    width: jellyBackgroundLayout.waveWidth,
    height: jellyBackgroundLayout.waveHeight,
    borderWidth: jellyBackgroundLayout.waveBorderWidth,
    borderRadius: jellyBackgroundLayout.waveHeight,
    opacity: jellyBackgroundLayout.waveOpacity,
    transform: [{ rotate: jellyBackgroundLayout.waveRotation }],
  },
  waveRose: {
    left: -jellyBackgroundLayout.waveWidth / 3,
  },
  waveBlue: {
    right: -jellyBackgroundLayout.waveWidth / 3,
    bottom:
      jellyBackgroundLayout.waveBottom -
      jellyBackgroundLayout.waveBorderWidth,
  },
})
