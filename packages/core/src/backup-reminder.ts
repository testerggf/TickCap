export interface BackupReminderState {
  hasData: boolean
  lastBackupAt: string | null
  reminderIntervalDays: 7 | 14 | 30 | null
}

export function isBackupReminderDue(
  state: BackupReminderState,
  now = new Date(),
): boolean {
  if (!state.hasData || state.reminderIntervalDays === null) return false
  if (state.lastBackupAt === null) return true
  const lastBackupAt = new Date(state.lastBackupAt).getTime()
  if (!Number.isFinite(lastBackupAt)) return true
  return (
    now.getTime() - lastBackupAt >=
    state.reminderIntervalDays * 24 * 60 * 60 * 1000
  )
}
