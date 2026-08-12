import type { SQLiteDatabase } from 'expo-sqlite'
import {
  localNotificationStatusSchema,
  type LocalNotificationStatus,
} from '@tickcap/api'

const LOCAL_NOTIFICATION_STATUS_KEY = 'local_notification_status'

interface MetaRow {
  value: string
}

export const DEFAULT_LOCAL_NOTIFICATION_STATUS: LocalNotificationStatus = {
  enabled: false,
  permission_status: 'not_determined',
  permission_requested_at: null,
  first_seal_offer_shown: false,
  consecutive_missed: 0,
  snooze_level: 0,
  last_app_open_at: null,
  last_reconciled_at: null,
  scheduled: { interval: null, seal: null },
}

export async function getLocalNotificationStatus(
  db: SQLiteDatabase,
): Promise<LocalNotificationStatus> {
  const row = await db.getFirstAsync<MetaRow>(
    'SELECT value FROM local_meta WHERE key = ?',
    LOCAL_NOTIFICATION_STATUS_KEY,
  )
  if (!row) return DEFAULT_LOCAL_NOTIFICATION_STATUS
  try {
    return localNotificationStatusSchema.parse(JSON.parse(row.value) as unknown)
  } catch {
    return DEFAULT_LOCAL_NOTIFICATION_STATUS
  }
}

export async function saveLocalNotificationStatus(
  db: SQLiteDatabase,
  status: LocalNotificationStatus,
): Promise<LocalNotificationStatus> {
  const parsed = localNotificationStatusSchema.parse(status)
  await db.runAsync(
    `INSERT INTO local_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    LOCAL_NOTIFICATION_STATUS_KEY,
    JSON.stringify(parsed),
  )
  return parsed
}

export async function markFirstSealNotificationOfferShown(
  db: SQLiteDatabase,
): Promise<LocalNotificationStatus> {
  const current = await getLocalNotificationStatus(db)
  return saveLocalNotificationStatus(db, {
    ...current,
    first_seal_offer_shown: true,
  })
}

export async function resetLocalNotificationSnooze(
  db: SQLiteDatabase,
): Promise<LocalNotificationStatus> {
  const current = await getLocalNotificationStatus(db)
  return saveLocalNotificationStatus(db, {
    ...current,
    consecutive_missed: 0,
    snooze_level: 0,
  })
}
