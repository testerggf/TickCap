import type { SQLiteDatabase } from 'expo-sqlite'
import {
  backupStatusSchema,
  type BackupContentSummary,
  type BackupStatus,
} from '@tickcap/api'
import { isBackupReminderDue } from '@tickcap/core'
import type { RestoreCounts } from './restore-repository'

const BACKUP_STATUS_KEY = 'backup_status'

interface MetaRow {
  value: string
}

export const DEFAULT_BACKUP_STATUS: BackupStatus = {
  reminder_interval_days: 7,
  last_backup: null,
  last_restore: null,
}

async function saveBackupStatus(
  db: SQLiteDatabase,
  status: BackupStatus,
): Promise<BackupStatus> {
  const parsed = backupStatusSchema.parse(status)
  await db.runAsync(
    `INSERT INTO local_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    BACKUP_STATUS_KEY,
    JSON.stringify(parsed),
  )
  return parsed
}

export async function getBackupStatus(
  db: SQLiteDatabase,
): Promise<BackupStatus> {
  const row = await db.getFirstAsync<MetaRow>(
    'SELECT value FROM local_meta WHERE key = ?',
    BACKUP_STATUS_KEY,
  )
  if (!row) return DEFAULT_BACKUP_STATUS
  try {
    return backupStatusSchema.parse(JSON.parse(row.value) as unknown)
  } catch {
    return DEFAULT_BACKUP_STATUS
  }
}

export async function recordBackupCreated(
  db: SQLiteDatabase,
  summary: BackupContentSummary,
  now = new Date(),
): Promise<BackupStatus> {
  const current = await getBackupStatus(db)
  return saveBackupStatus(db, {
    ...current,
    last_backup: { created_at: now.toISOString(), summary },
  })
}

export async function recordRestoreCompleted(
  db: SQLiteDatabase,
  counts: RestoreCounts,
  now = new Date(),
): Promise<BackupStatus> {
  const current = await getBackupStatus(db)
  return saveBackupStatus(db, {
    ...current,
    last_restore: {
      completed_at: now.toISOString(),
      inserted: counts.insert,
      replaced: counts.replace,
      skipped: counts.skip,
    },
  })
}

export async function updateBackupReminderInterval(
  db: SQLiteDatabase,
  reminderIntervalDays: BackupStatus['reminder_interval_days'],
): Promise<BackupStatus> {
  const current = await getBackupStatus(db)
  return saveBackupStatus(db, {
    ...current,
    reminder_interval_days: reminderIntervalDays,
  })
}

export async function getBackupReminderDue(
  db: SQLiteDatabase,
  status: BackupStatus,
  now = new Date(),
): Promise<boolean> {
  const capsuleRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM capsules WHERE deleted_at IS NULL',
  )
  return isBackupReminderDue(
    {
      hasData: (capsuleRow?.count ?? 0) > 0,
      lastBackupAt: status.last_backup?.created_at ?? null,
      reminderIntervalDays: status.reminder_interval_days,
    },
    now,
  )
}
