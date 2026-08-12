import type { SQLiteDatabase } from 'expo-sqlite'
import type {
  ThemeMode,
  VisualThemeName,
} from '@tickcap/tokens'

const APPEARANCE_KEY = 'appearance_preferences'

export type ColorSchemePreference = 'system' | ThemeMode

export interface AppearancePreferences {
  visualTheme: VisualThemeName
  colorScheme: ColorSchemePreference
}

interface MetaRow {
  value: string
}

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  visualTheme: 'chronoAmber',
  colorScheme: 'system',
}

function isVisualTheme(value: unknown): value is VisualThemeName {
  return value === 'chronoAmber' || value === 'jellyGlass'
}

function isColorScheme(value: unknown): value is ColorSchemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function parseAppearance(value: string): AppearancePreferences {
  try {
    const candidate = JSON.parse(value) as {
      visualTheme?: unknown
      colorScheme?: unknown
    }
    return {
      visualTheme: isVisualTheme(candidate.visualTheme)
        ? candidate.visualTheme
        : DEFAULT_APPEARANCE_PREFERENCES.visualTheme,
      colorScheme: isColorScheme(candidate.colorScheme)
        ? candidate.colorScheme
        : DEFAULT_APPEARANCE_PREFERENCES.colorScheme,
    }
  } catch {
    return DEFAULT_APPEARANCE_PREFERENCES
  }
}

export async function getAppearancePreferences(
  db: SQLiteDatabase,
): Promise<AppearancePreferences> {
  const row = await db.getFirstAsync<MetaRow>(
    'SELECT value FROM local_meta WHERE key = ?',
    APPEARANCE_KEY,
  )
  return row ? parseAppearance(row.value) : DEFAULT_APPEARANCE_PREFERENCES
}

export async function updateAppearancePreferences(
  db: SQLiteDatabase,
  patch: Partial<AppearancePreferences>,
): Promise<AppearancePreferences> {
  const current = await getAppearancePreferences(db)
  const next: AppearancePreferences = {
    visualTheme: patch.visualTheme ?? current.visualTheme,
    colorScheme: patch.colorScheme ?? current.colorScheme,
  }
  await db.runAsync(
    `INSERT INTO local_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    APPEARANCE_KEY,
    JSON.stringify(next),
  )
  return next
}
