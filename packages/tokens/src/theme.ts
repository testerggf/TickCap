export type ThemeMode = 'light' | 'dark'
export type VisualThemeName = 'chronoAmber' | 'jellyGlass'

export interface Theme {
  visualTheme: VisualThemeName
  mode: ThemeMode
  bg: string
  surface: string
  surface2: string
  border: string
  text1: string
  text2: string
  text3: string
  primary: string
  primarySoft: string
  actionStart: string
  actionEnd: string
  /** Web 渐变表达；React Native 使用 actionStart/actionEnd。 */
  gradientAction: string
  glassBg: string
  glassBorder: string
  glassBlur: number
  glassSaturate: number
  /** Web 极光表达；React Native 使用 auroraColors/auroraOpacity。 */
  aurora: string
  auroraColors: readonly [string, string, string, string]
  auroraOpacity: number
  capsuleRadius: number
  capsuleTintAlpha: number
  capsuleBorderAlpha: number
  capsuleShadowAlpha: number
  capsuleIconTintAlpha: number
  nodeGlowAlpha: number
  disabledOpacity: number
  pressedOpacity: number
  pressScale: number
}

const chronoAmber: Record<ThemeMode, Theme> = {
  light: {
    visualTheme: 'chronoAmber',
    mode: 'light',
    bg: '#FBF7F8',
    surface: '#FFFCFD',
    surface2: 'rgba(255,250,251,.82)',
    border: 'rgba(73,51,68,.12)',
    text1: '#281B27',
    text2: '#74656F',
    text3: '#A89CA4',
    primary: '#FF5B82',
    primarySoft: 'rgba(255,91,130,.12)',
    actionStart: '#FF647F',
    actionEnd: '#FF9A5C',
    gradientAction: 'linear-gradient(135deg, #FF647F, #FF9A5C)',
    glassBg: 'rgba(255,252,253,.74)',
    glassBorder: 'rgba(255,255,255,.86)',
    glassBlur: 14,
    glassSaturate: 132,
    aurora: [
      'radial-gradient(circle at 12% 8%, rgba(255,91,130,.11), transparent 43%)',
      'radial-gradient(circle at 92% 18%, rgba(255,154,92,.10), transparent 42%)',
      'radial-gradient(circle at 18% 94%, rgba(154,123,255,.08), transparent 48%)',
      'radial-gradient(circle at 88% 92%, rgba(103,191,234,.08), transparent 45%)',
    ].join(', '),
    auroraColors: ['#FF5B82', '#FF9A5C', '#9A7BFF', '#67BFEA'],
    auroraOpacity: 0.11,
    capsuleRadius: 18,
    capsuleTintAlpha: 0.06,
    capsuleBorderAlpha: 0.42,
    capsuleShadowAlpha: 0.1,
    capsuleIconTintAlpha: 0.12,
    nodeGlowAlpha: 0.16,
    disabledOpacity: 0.42,
    pressedOpacity: 0.84,
    pressScale: 0.98,
  },
  dark: {
    visualTheme: 'chronoAmber',
    mode: 'dark',
    bg: '#171216',
    surface: '#241C22',
    surface2: 'rgba(48,37,45,.82)',
    border: 'rgba(238,220,232,.14)',
    text1: '#FBF5F8',
    text2: '#C7B8C2',
    text3: '#887984',
    primary: '#FF7395',
    primarySoft: 'rgba(255,115,149,.16)',
    actionStart: '#FF6F8D',
    actionEnd: '#FFA06B',
    gradientAction: 'linear-gradient(135deg, #FF6F8D, #FFA06B)',
    glassBg: 'rgba(40,30,38,.76)',
    glassBorder: 'rgba(255,255,255,.13)',
    glassBlur: 14,
    glassSaturate: 132,
    aurora: [
      'radial-gradient(circle at 12% 8%, rgba(255,115,149,.18), transparent 43%)',
      'radial-gradient(circle at 92% 18%, rgba(255,160,107,.14), transparent 42%)',
      'radial-gradient(circle at 20% 94%, rgba(154,123,255,.13), transparent 48%)',
      'radial-gradient(circle at 88% 92%, rgba(103,191,234,.11), transparent 45%)',
    ].join(', '),
    auroraColors: ['#FF7395', '#FFA06B', '#A990FF', '#78C7ED'],
    auroraOpacity: 0.17,
    capsuleRadius: 18,
    capsuleTintAlpha: 0.07,
    capsuleBorderAlpha: 0.45,
    capsuleShadowAlpha: 0.12,
    capsuleIconTintAlpha: 0.14,
    nodeGlowAlpha: 0.18,
    disabledOpacity: 0.42,
    pressedOpacity: 0.84,
    pressScale: 0.98,
  },
}

const jellyGlass: Record<ThemeMode, Theme> = {
  light: {
    visualTheme: 'jellyGlass',
    mode: 'light',
    bg: '#FFF9FC',
    surface: '#FFFCFE',
    surface2: 'rgba(255,255,255,.48)',
    border: 'rgba(112,91,108,.17)',
    text1: '#17111F',
    text2: '#746D7D',
    text3: '#9B93A3',
    primary: '#FF5578',
    primarySoft: 'rgba(255,85,120,.12)',
    actionStart: '#FF7186',
    actionEnd: '#FF8D77',
    gradientAction: 'linear-gradient(135deg, #FF7186, #FF8D77)',
    glassBg: 'rgba(255,255,255,.55)',
    glassBorder: 'rgba(255,255,255,.92)',
    glassBlur: 24,
    glassSaturate: 220,
    aurora: [
      'radial-gradient(circle at 8% 8%, rgba(255,178,194,.24), transparent 46%)',
      'radial-gradient(circle at 94% 22%, rgba(255,211,190,.24), transparent 46%)',
      'radial-gradient(circle at 12% 92%, rgba(255,172,208,.24), transparent 52%)',
      'radial-gradient(circle at 92% 90%, rgba(154,211,255,.24), transparent 48%)',
    ].join(', '),
    auroraColors: ['#FFB2C2', '#FFD3BE', '#FFACD0', '#9AD3FF'],
    auroraOpacity: 0.2,
    capsuleRadius: 34,
    capsuleTintAlpha: 0.12,
    capsuleBorderAlpha: 0.34,
    capsuleShadowAlpha: 0.16,
    capsuleIconTintAlpha: 0.14,
    nodeGlowAlpha: 0.24,
    disabledOpacity: 0.4,
    pressedOpacity: 0.8,
    pressScale: 0.96,
  },
  dark: {
    visualTheme: 'jellyGlass',
    mode: 'dark',
    bg: '#15111A',
    surface: '#211B29',
    surface2: 'rgba(55,45,68,.48)',
    border: 'rgba(238,225,240,.18)',
    text1: '#FFF8FC',
    text2: '#CDC0CB',
    text3: '#8D8190',
    primary: '#FF7693',
    primarySoft: 'rgba(255,118,147,.16)',
    actionStart: '#FF718E',
    actionEnd: '#FFA078',
    gradientAction: 'linear-gradient(135deg, #FF718E, #FFA078)',
    glassBg: 'rgba(42,34,51,.50)',
    glassBorder: 'rgba(255,255,255,.22)',
    glassBlur: 24,
    glassSaturate: 220,
    aurora: [
      'radial-gradient(circle at 12% 10%, rgba(255,84,163,.28), transparent 45%)',
      'radial-gradient(circle at 92% 20%, rgba(255,160,60,.20), transparent 45%)',
      'radial-gradient(circle at 25% 95%, rgba(90,160,255,.22), transparent 50%)',
    ].join(', '),
    auroraColors: ['#FF718E', '#FFA078', '#8D70E8', '#5AA7D8'],
    auroraOpacity: 0.24,
    capsuleRadius: 34,
    capsuleTintAlpha: 0.14,
    capsuleBorderAlpha: 0.38,
    capsuleShadowAlpha: 0.2,
    capsuleIconTintAlpha: 0.24,
    nodeGlowAlpha: 0.24,
    disabledOpacity: 0.4,
    pressedOpacity: 0.8,
    pressScale: 0.96,
  },
}

export const visualThemes: Record<
  VisualThemeName,
  Record<ThemeMode, Theme>
> = {
  chronoAmber,
  jellyGlass,
}

export function resolveTheme(
  visualTheme: VisualThemeName,
  mode: ThemeMode,
): Theme {
  return visualThemes[visualTheme][mode]
}

/**
 * Web M1 的兼容出口。现有 Web 保持果冻玻璃，迁移到双主题时再显式传
 * visualTheme；移动端使用 nativeVisualThemes/resolveNativeTheme。
 */
export const themes: Record<ThemeMode, Theme> = visualThemes.jellyGlass
