import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useColorScheme } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import {
  resolveNativeTheme,
  type NativeTheme,
  type ThemeMode,
  type VisualThemeName,
} from '@tickcap/tokens'
import {
  DEFAULT_APPEARANCE_PREFERENCES,
  getAppearancePreferences,
  updateAppearancePreferences,
  type AppearancePreferences,
  type ColorSchemePreference,
} from '../data/repositories/appearance-repository'

interface TickCapThemeContextValue {
  theme: NativeTheme
  mode: ThemeMode
  preferences: AppearancePreferences
  reloadPreferences: () => Promise<void>
  setVisualTheme: (visualTheme: VisualThemeName) => Promise<void>
  setColorScheme: (colorScheme: ColorSchemePreference) => Promise<void>
}

const TickCapThemeContext = createContext<TickCapThemeContextValue | null>(
  null,
)

export function TickCapThemeProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext()
  const systemMode = useColorScheme()
  const [preferences, setPreferences] = useState<AppearancePreferences>(
    DEFAULT_APPEARANCE_PREFERENCES,
  )

  useEffect(() => {
    let cancelled = false
    void getAppearancePreferences(db).then((next) => {
      if (!cancelled) setPreferences(next)
    })
    return () => {
      cancelled = true
    }
  }, [db])

  const mode: ThemeMode =
    preferences.colorScheme === 'system'
      ? systemMode === 'dark'
        ? 'dark'
        : 'light'
      : preferences.colorScheme

  const setVisualTheme = useCallback(
    async (visualTheme: VisualThemeName) => {
      setPreferences((current) => ({ ...current, visualTheme }))
      try {
        setPreferences(
          await updateAppearancePreferences(db, { visualTheme }),
        )
      } catch (error) {
        setPreferences(await getAppearancePreferences(db))
        throw error
      }
    },
    [db],
  )

  const setColorScheme = useCallback(
    async (colorScheme: ColorSchemePreference) => {
      setPreferences((current) => ({ ...current, colorScheme }))
      try {
        setPreferences(
          await updateAppearancePreferences(db, { colorScheme }),
        )
      } catch (error) {
        setPreferences(await getAppearancePreferences(db))
        throw error
      }
    },
    [db],
  )

  const reloadPreferences = useCallback(async () => {
    setPreferences(await getAppearancePreferences(db))
  }, [db])

  const value = useMemo<TickCapThemeContextValue>(
    () => ({
      theme: resolveNativeTheme(preferences.visualTheme, mode),
      mode,
      preferences,
      reloadPreferences,
      setVisualTheme,
      setColorScheme,
    }),
    [mode, preferences, reloadPreferences, setColorScheme, setVisualTheme],
  )

  return (
    <TickCapThemeContext.Provider value={value}>
      {children}
    </TickCapThemeContext.Provider>
  )
}

export function useTickCapTheme(): TickCapThemeContextValue {
  const value = useContext(TickCapThemeContext)
  if (!value) {
    throw new Error('useTickCapTheme 必须在 TickCapThemeProvider 内使用')
  }
  return value
}
