import type { SQLiteDatabase } from 'expo-sqlite'
import * as Crypto from 'expo-crypto'
import {
  localBackupPayloadSchema,
  localBackupSchema,
  type BackupContentSummary,
  type LocalBackupPayload,
} from '@tickcap/api'
import {
  buildCanonicalJson,
  buildTickCapBackupJson,
  buildTickCapJson,
  buildTickCapMarkdown,
  type UserTimeSettings,
} from '@tickcap/core'
import { getAppearancePreferences } from './appearance-repository'
import { getOnboardingPreferences } from './onboarding-repository'
import { getTimeSettings } from './settings-repository'

interface JsonRow {
  [key: string]: string | number | null
}

async function activeRows(
  db: SQLiteDatabase,
  table: 'capsules' | 'day_seals' | 'ai_reports' | 'tags',
): Promise<JsonRow[]> {
  return db.getAllAsync<JsonRow>(
    `SELECT * FROM ${table} WHERE deleted_at IS NULL ORDER BY created_at, id`,
  )
}

async function allRows(
  db: SQLiteDatabase,
  table: 'capsules' | 'day_seals' | 'ai_reports' | 'tags',
): Promise<JsonRow[]> {
  return db.getAllAsync<JsonRow>(
    `SELECT * FROM ${table} ORDER BY created_at, id`,
  )
}

function parseJsonFields(row: JsonRow): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row }
  for (const key of ['tag_ids_json']) {
    if (typeof result[key] === 'string') {
      result[key.replace(/_json$/, '')] = JSON.parse(result[key] as string) as unknown
      delete result[key]
    }
  }
  return result
}

export async function buildLocalExport(
  db: SQLiteDatabase,
  settings: UserTimeSettings,
  now = new Date(),
): Promise<{ markdown: string; json: string }> {
  const [capsuleRows, sealRows, reportRows, tagRows] = await Promise.all([
    activeRows(db, 'capsules'),
    activeRows(db, 'day_seals'),
    activeRows(db, 'ai_reports'),
    activeRows(db, 'tags'),
  ])
  const tagsById = new Map(
    tagRows.map((tag) => [String(tag.id), String(tag.name)]),
  )
  const capsules = capsuleRows.map(parseJsonFields)
  const seals = sealRows.map(parseJsonFields)
  const reports = reportRows.map(parseJsonFields)
  const tags = tagRows.map(parseJsonFields)

  return {
    markdown: buildTickCapMarkdown({
      timezone: settings.timezone,
      capsules: capsules.map((capsule) => ({
        id: String(capsule.id),
        date: String(capsule.date),
        startAt: String(capsule.start_at),
        endAt: String(capsule.end_at),
        tagNames: Array.isArray(capsule.tag_ids)
          ? capsule.tag_ids.map((id) => tagsById.get(String(id)) ?? '记录')
          : [],
        summary: typeof capsule.summary === 'string' ? capsule.summary : null,
        detail: typeof capsule.detail === 'string' ? capsule.detail : null,
        mood: typeof capsule.mood === 'number' ? capsule.mood : null,
        isHighlight: capsule.is_highlight === 1,
        isPrivate: capsule.is_private === 1,
      })),
      seals: seals.map((seal) => ({
        date: String(seal.date),
        note: typeof seal.note === 'string' ? seal.note : null,
        streak: Number(seal.streak),
        sealedAt: String(seal.sealed_at),
      })),
      reports: reports.map((report) => ({
        periodStart: String(report.period_start),
        type: report.type as 'daily' | 'weekly' | 'monthly' | 'yearly',
        contentMd:
          typeof report.content_md === 'string' ? report.content_md : null,
        editedMd:
          typeof report.edited_md === 'string' ? report.edited_md : null,
      })),
    }),
    json: buildTickCapJson({
      formatVersion: 1,
      exportedAt: now.toISOString(),
      timezone: settings.timezone,
      settings: {
        timezone: settings.timezone,
        day_boundary_min: settings.dayBoundaryMin,
        wake_default_min: settings.wakeDefaultMin,
      },
      capsules,
      seals,
      reports,
      tags,
    }),
  }
}

function nullableString(value: string | number | null | undefined): string | null {
  return typeof value === 'string' ? value : null
}

function normalizedBackupPayload(
  rows: {
    capsules: JsonRow[]
    daySeals: JsonRow[]
    reports: JsonRow[]
    tags: JsonRow[]
  },
  preferences: {
    time: UserTimeSettings
    onboarding: Awaited<ReturnType<typeof getOnboardingPreferences>>
    appearance: Awaited<ReturnType<typeof getAppearancePreferences>>
  },
): LocalBackupPayload {
  return localBackupPayloadSchema.parse({
    preferences: {
      time_settings: {
        timezone: preferences.time.timezone,
        day_boundary_min: preferences.time.dayBoundaryMin,
        wake_default_min: preferences.time.wakeDefaultMin,
      },
      onboarding_preferences: preferences.onboarding,
      appearance_preferences: {
        visual_theme: preferences.appearance.visualTheme,
        color_scheme: preferences.appearance.colorScheme,
      },
    },
    tables: {
      tags: rows.tags.map((tag) => ({
        id: String(tag.id),
        name: String(tag.name),
        emoji: String(tag.emoji),
        color: String(tag.color),
        parent_id: nullableString(tag.parent_id),
        sort: Number(tag.sort),
        archived_at: nullableString(tag.archived_at),
        created_at: String(tag.created_at),
        updated_at: String(tag.updated_at),
        deleted_at: nullableString(tag.deleted_at),
      })),
      capsules: rows.capsules.map((capsule) => {
        const normalized = parseJsonFields(capsule)
        return {
          ...normalized,
          is_highlight: normalized.is_highlight === 1,
          is_private: normalized.is_private === 1,
        }
      }),
      day_seals: rows.daySeals.map(parseJsonFields),
      ai_reports: rows.reports.map(parseJsonFields),
    },
  })
}

/**
 * 生成可恢复的完整个人备份。包含软删除业务行与本机偏好；有意排除
 * device_id、sync_cursor、outbox、sync_conflicts、event_outbox 等设备运行态。
 */
export async function buildLocalBackup(
  db: SQLiteDatabase,
  appVersion: string,
  now = new Date(),
): Promise<string> {
  return (await buildLocalBackupArtifact(db, appVersion, now)).content
}

export interface LocalBackupArtifact {
  content: string
  summary: BackupContentSummary
}

export async function buildLocalBackupArtifact(
  db: SQLiteDatabase,
  appVersion: string,
  now = new Date(),
): Promise<LocalBackupArtifact> {
  const [capsules, daySeals, reports, tags, time, onboarding, appearance] =
    await Promise.all([
      allRows(db, 'capsules'),
      allRows(db, 'day_seals'),
      allRows(db, 'ai_reports'),
      allRows(db, 'tags'),
      getTimeSettings(db),
      getOnboardingPreferences(db),
      getAppearancePreferences(db),
    ])
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )
  const payload = normalizedBackupPayload(
    { capsules, daySeals, reports, tags },
    { time, onboarding, appearance },
  )
  const payloadSha256 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    buildCanonicalJson(payload),
  )
  const backup = localBackupSchema.parse({
    kind: 'tickcap-local-backup',
    format_version: 1,
    exported_at: now.toISOString(),
    app_version: appVersion,
    local_schema_version: versionRow?.user_version ?? 1,
    payload,
    integrity: {
      algorithm: 'sha256',
      payload_sha256: payloadSha256,
    },
  })
  const tables = backup.payload.tables
  const entities = [
    ...tables.tags,
    ...tables.capsules,
    ...tables.day_seals,
    ...tables.ai_reports,
  ]
  return {
    content: buildTickCapBackupJson(backup),
    summary: {
      entity_count: entities.length,
      soft_deleted_count: entities.filter(
        (entity) => entity.deleted_at !== null,
      ).length,
      tables: {
        tags: tables.tags.length,
        capsules: tables.capsules.length,
        day_seals: tables.day_seals.length,
        ai_reports: tables.ai_reports.length,
      },
    },
  }
}
