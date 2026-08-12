import { z } from 'zod'
import {
  entityFieldSchema,
  entityPayloadSchema,
  entityTypeSchema,
  isoDateTimeSchema,
  uuidSchema,
  uuidV7Schema,
} from './primitives'
import { syncActionSchema } from './sync'

export const LOCAL_SCHEMA_VERSION = 1

export const localTimeSettingsSchema = z
  .object({
    timezone: z.string().min(1).max(64),
    day_boundary_min: z.number().int().min(0).max(1439),
    wake_default_min: z.number().int().min(0).max(1439),
  })
  .strict()

export const onboardingPreferencesSchema = z
  .object({
    completed: z.boolean(),
    reminder_interval_min: z.union([
      z.literal(30),
      z.literal(60),
      z.literal(120),
    ]),
    seal_reminder_min: z.number().int().min(0).max(1439),
  })
  .strict()

export const backupContentSummarySchema = z
  .object({
    entity_count: z.number().int().nonnegative(),
    soft_deleted_count: z.number().int().nonnegative(),
    tables: z
      .object({
        tags: z.number().int().nonnegative(),
        capsules: z.number().int().nonnegative(),
        day_seals: z.number().int().nonnegative(),
        ai_reports: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()

export const backupStatusSchema = z
  .object({
    reminder_interval_days: z.union([
      z.literal(7),
      z.literal(14),
      z.literal(30),
      z.null(),
    ]),
    last_backup: z
      .object({
        created_at: isoDateTimeSchema,
        summary: backupContentSummarySchema,
      })
      .strict()
      .nullable(),
    last_restore: z
      .object({
        completed_at: isoDateTimeSchema,
        inserted: z.number().int().nonnegative(),
        replaced: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
  })
  .strict()

export const syncStateSchema = z.enum([
  'idle',
  'pushing',
  'pulling',
  'applying',
  'retry_wait',
  'paused_auth',
])

export const localMetaSchema = z
  .object({
    schema_version: z.number().int().min(1),
    device_id: z.string().min(1).max(128),
    sync_cursor: z.string().nullable(),
    last_sync_at: isoDateTimeSchema.nullable(),
  })
  .strict()

export const outboxRecordSchema = z
  .object({
    op_id: uuidV7Schema,
    entity_type: entityTypeSchema,
    entity_id: uuidSchema,
    action: syncActionSchema,
    base_updated_at: isoDateTimeSchema.nullable(),
    client_updated_at: isoDateTimeSchema,
    changed_fields: z.array(entityFieldSchema).max(64),
    payload: entityPayloadSchema,
    attempts: z.number().int().nonnegative(),
    next_retry_at: isoDateTimeSchema.nullable(),
    created_at: isoDateTimeSchema,
  })
  .strict()

export const syncConflictRecordSchema = z
  .object({
    id: uuidSchema,
    entity_type: entityTypeSchema,
    entity_id: uuidSchema,
    field: z.literal('detail'),
    local_value: z.unknown(),
    server_value: z.unknown(),
    server_updated_at: isoDateTimeSchema,
    resolved_at: isoDateTimeSchema.nullable(),
  })
  .strict()

export type SyncState = z.infer<typeof syncStateSchema>
export type LocalTimeSettings = z.infer<typeof localTimeSettingsSchema>
export type OnboardingPreferences = z.infer<
  typeof onboardingPreferencesSchema
>
export type BackupContentSummary = z.infer<typeof backupContentSummarySchema>
export type BackupStatus = z.infer<typeof backupStatusSchema>
export type LocalMeta = z.infer<typeof localMetaSchema>
export type OutboxRecord = z.infer<typeof outboxRecordSchema>
export type SyncConflictRecord = z.infer<typeof syncConflictRecordSchema>
