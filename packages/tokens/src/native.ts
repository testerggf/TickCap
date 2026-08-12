import {
  visualThemes,
  type Theme,
  type ThemeMode,
  type VisualThemeName,
} from './theme'

/** React Native 可直接消费的主题字段；排除 CSS gradient/aurora 字符串。 */
export type NativeTheme = Omit<Theme, 'gradientAction' | 'aurora'>

function toNativeTheme(theme: Theme): NativeTheme {
  const { gradientAction: _gradientAction, aurora: _aurora, ...native } = theme
  return native
}

export const nativeVisualThemes: Record<
  VisualThemeName,
  Record<ThemeMode, NativeTheme>
> = {
  chronoAmber: {
    light: toNativeTheme(visualThemes.chronoAmber.light),
    dark: toNativeTheme(visualThemes.chronoAmber.dark),
  },
  jellyGlass: {
    light: toNativeTheme(visualThemes.jellyGlass.light),
    dark: toNativeTheme(visualThemes.jellyGlass.dark),
  },
}

export function resolveNativeTheme(
  visualTheme: VisualThemeName,
  mode: ThemeMode,
): NativeTheme {
  return nativeVisualThemes[visualTheme][mode]
}

/** 旧移动端兼容出口；新 UI 必须使用 resolveNativeTheme。 */
export const nativeThemes: Record<ThemeMode, NativeTheme> =
  nativeVisualThemes.jellyGlass
