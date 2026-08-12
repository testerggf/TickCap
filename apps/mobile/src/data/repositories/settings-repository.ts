import type { SQLiteDatabase } from 'expo-sqlite'
import { localTimeSettingsSchema } from '@tickcap/api'
import {
  DEFAULT_TIME_SETTINGS,
  type UserTimeSettings,
} from '@tickcap/core'

const SETTINGS_KEY = 'time_settings'

interface MetaRow {
  value: string
}

function fallbackTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_SETTINGS.timezone
}

function toLocal(settings: UserTimeSettings) {
  return localTimeSettingsSchema.parse({
    timezone: settings.timezone,
    day_boundary_min: settings.dayBoundaryMin,
    wake_default_min: settings.wakeDefaultMin,
  })
}

export async function getTimeSettings(
  db: SQLiteDatabase,
): Promise<UserTimeSettings> {
  const row = await db.getFirstAsync<MetaRow>(
    'SELECT value FROM local_meta WHERE key = ?',
    SETTINGS_KEY,
  )
  if (!row) {
    return {
      ...DEFAULT_TIME_SETTINGS,
      timezone: fallbackTimezone(),
    }
  }
  const stored = localTimeSettingsSchema.parse(JSON.parse(row.value) as unknown)
  return {
    timezone: stored.timezone,
    dayBoundaryMin: stored.day_boundary_min,
    wakeDefaultMin: stored.wake_default_min,
  }
}

export async function updateTimeSettings(
  db: SQLiteDatabase,
  patch: Partial<UserTimeSettings>,
): Promise<UserTimeSettings> {
  const current = await getTimeSettings(db)
  const next = { ...current, ...patch }
  const stored = toLocal(next)
  await db.runAsync(
    `INSERT INTO local_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTINGS_KEY,
    JSON.stringify(stored),
  )
  return next
}
