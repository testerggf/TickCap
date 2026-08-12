import { z } from 'zod'
import { capsuleEntitySchema } from './capsules'
import {
  isoDateTimeSchema,
  uuidSchema,
} from './primitives'
import {
  aiReportEntitySchema,
  daySealEntitySchema,
} from './reports'
import {
  localTimeSettingsSchema,
  onboardingPreferencesSchema,
} from './local'

export const LOCAL_BACKUP_FORMAT_VERSION = 1

export const appearancePreferencesSchema = z
  .object({
    visual_theme: z.enum(['chronoAmber', 'jellyGlass']),
    color_scheme: z.enum(['system', 'light', 'dark']),
  })
  .strict()

export const backupTagSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1).max(50),
    emoji: z.string().max(16),
    color: z.string().min(1).max(64),
    parent_id: uuidSchema.nullable(),
    sort: z.number().int(),
    archived_at: isoDateTimeSchema.nullable(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
    deleted_at: isoDateTimeSchema.nullable(),
  })
  .strict()

export const localBackupPayloadSchema = z
  .object({
    preferences: z
      .object({
        time_settings: localTimeSettingsSchema,
        onboarding_preferences: onboardingPreferencesSchema,
        appearance_preferences: appearancePreferencesSchema,
      })
      .strict(),
    tables: z
      .object({
        tags: z.array(backupTagSchema),
        capsules: z.array(capsuleEntitySchema),
        day_seals: z.array(daySealEntitySchema),
        ai_reports: z.array(aiReportEntitySchema),
      })
      .strict(),
  })
  .strict()
  .superRefine((payload, context) => {
    const tables = payload.tables
    for (const tableName of [
      'tags',
      'capsules',
      'day_seals',
      'ai_reports',
    ] as const) {
      const seen = new Set<string>()
      tables[tableName].forEach((entity, index) => {
        if (seen.has(entity.id)) {
          context.addIssue({
            code: 'custom',
            message: `${tableName} 包含重复 id`,
            path: ['tables', tableName, index, 'id'],
          })
        }
        seen.add(entity.id)
      })
    }

    const sealDates = new Set<string>()
    tables.day_seals.forEach((seal, index) => {
      if (sealDates.has(seal.date)) {
        context.addIssue({
          code: 'custom',
          message: 'day_seals 包含重复 date',
          path: ['tables', 'day_seals', index, 'date'],
        })
      }
      sealDates.add(seal.date)
    })

    const tagIds = new Set(tables.tags.map((tag) => tag.id))
    tables.tags.forEach((tag, index) => {
      if (tag.parent_id !== null && !tagIds.has(tag.parent_id)) {
        context.addIssue({
          code: 'custom',
          message: '标签 parent_id 不在备份中',
          path: ['tables', 'tags', index, 'parent_id'],
        })
      }
    })
    tables.capsules.forEach((capsule, capsuleIndex) => {
      capsule.tag_ids.forEach((tagId, tagIndex) => {
        if (!tagIds.has(tagId)) {
          context.addIssue({
            code: 'custom',
            message: '胶囊引用的标签不在备份中',
            path: [
              'tables',
              'capsules',
              capsuleIndex,
              'tag_ids',
              tagIndex,
            ],
          })
        }
      })
    })
  })

export const localBackupSchema = z
  .object({
    kind: z.literal('tickcap-local-backup'),
    format_version: z.literal(LOCAL_BACKUP_FORMAT_VERSION),
    exported_at: isoDateTimeSchema,
    app_version: z.string().min(1).max(64),
    local_schema_version: z.number().int().min(1),
    payload: localBackupPayloadSchema,
    integrity: z
      .object({
        algorithm: z.literal('sha256'),
        payload_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
  })
  .strict()

export type AppearancePreferencesRecord = z.infer<
  typeof appearancePreferencesSchema
>
export type BackupTag = z.infer<typeof backupTagSchema>
export type LocalBackupPayload = z.infer<typeof localBackupPayloadSchema>
export type LocalBackup = z.infer<typeof localBackupSchema>
