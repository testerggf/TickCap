import type { SQLiteDatabase } from 'expo-sqlite'
import {
  onboardingPreferencesSchema,
  type OnboardingPreferences,
} from '@tickcap/api'
import {
  buildEventRecord,
  enqueueEvent,
} from './event-repository'

const ONBOARDING_KEY = 'onboarding_preferences'

export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  completed: false,
  reminder_interval_min: 60,
  seal_reminder_min: 21 * 60 + 30,
}

interface MetaRow {
  value: string
}

export async function getOnboardingPreferences(
  db: SQLiteDatabase,
): Promise<OnboardingPreferences> {
  const row = await db.getFirstAsync<MetaRow>(
    'SELECT value FROM local_meta WHERE key = ?',
    ONBOARDING_KEY,
  )
  if (row) {
    return onboardingPreferencesSchema.parse(JSON.parse(row.value) as unknown)
  }

  const capsuleRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM capsules WHERE deleted_at IS NULL',
  )
  if ((capsuleRow?.count ?? 0) > 0) {
    return { ...DEFAULT_ONBOARDING_PREFERENCES, completed: true }
  }
  return DEFAULT_ONBOARDING_PREFERENCES
}

export async function needsOnboarding(db: SQLiteDatabase): Promise<boolean> {
  return !(await getOnboardingPreferences(db)).completed
}

export async function completeOnboarding(
  db: SQLiteDatabase,
  input: Pick<
    OnboardingPreferences,
    'reminder_interval_min' | 'seal_reminder_min'
  >,
  now = new Date(),
): Promise<OnboardingPreferences> {
  const preferences = onboardingPreferencesSchema.parse({
    completed: true,
    ...input,
  })
  const event = await buildEventRecord(
    'onboarding_step',
    { step: 3 },
    now,
  )
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO local_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ONBOARDING_KEY,
      JSON.stringify(preferences),
    )
    await enqueueEvent(transaction, event)
  })
  return preferences
}

export async function updateReminderPreferences(
  db: SQLiteDatabase,
  input: Pick<
    OnboardingPreferences,
    'reminder_interval_min' | 'seal_reminder_min'
  >,
): Promise<OnboardingPreferences> {
  const current = await getOnboardingPreferences(db)
  const preferences = onboardingPreferencesSchema.parse({
    ...current,
    ...input,
  })
  await db.runAsync(
    `INSERT INTO local_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ONBOARDING_KEY,
    JSON.stringify(preferences),
  )
  return preferences
}
