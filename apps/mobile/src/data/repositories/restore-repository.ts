import type { SQLiteDatabase } from 'expo-sqlite'
import * as Crypto from 'expo-crypto'
import { Directory, File, Paths } from 'expo-file-system'
import {
  localBackupSchema,
  type AiReportEntity,
  type BackupTag,
  type CapsuleEntity,
  type DaySealEntity,
  type LocalBackup,
} from '@tickcap/api'
import {
  buildCanonicalJson,
  findStableKeyConflicts,
  planTimestampedBackupMerge,
  type BackupMergeDecision,
} from '@tickcap/core'
import { buildLocalBackup } from './export-repository'

const MAX_BACKUP_BYTES = 50 * 1024 * 1024

interface LocalVersion {
  id: string
  updated_at: string
}

interface LocalSealVersion extends LocalVersion {
  date: string
}

interface RestorePlans {
  tags: BackupMergeDecision<BackupTag>[]
  capsules: BackupMergeDecision<CapsuleEntity>[]
  day_seals: BackupMergeDecision<DaySealEntity>[]
  ai_reports: BackupMergeDecision<AiReportEntity>[]
}

export interface RestoreCounts {
  insert: number
  replace: number
  skip: number
}

export interface LocalRestorePreview {
  backup: LocalBackup
  plans: RestorePlans
  counts: RestoreCounts
  entityCount: number
  sealDateConflicts: string[]
}

export interface LocalRestoreResult {
  counts: RestoreCounts
  recoveryBackupUri: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string): unknown {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('备份文件超过 50 MB，未进行任何写入')
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('这不是有效的 JSON 备份文件')
  }
}

function summarize(plans: RestorePlans): RestoreCounts {
  const counts: RestoreCounts = { insert: 0, replace: 0, skip: 0 }
  const actions = [
    ...plans.tags.map((decision) => decision.action),
    ...plans.capsules.map((decision) => decision.action),
    ...plans.day_seals.map((decision) => decision.action),
    ...plans.ai_reports.map((decision) => decision.action),
  ]
  for (const action of actions) counts[action] += 1
  return counts
}

async function verifyBackup(
  text: string,
  supportedSchemaVersion: number,
): Promise<LocalBackup> {
  const json = parseJson(text)
  if (!isRecord(json) || json.kind !== 'tickcap-local-backup') {
    throw new Error('请选择 TickCap 完整备份文件，而不是阅读导出 JSON')
  }
  if (json.format_version !== 1) {
    throw new Error(`暂不支持备份格式版本 ${String(json.format_version)}`)
  }
  const parsed = localBackupSchema.safeParse(json)
  if (!parsed.success) throw new Error('备份结构不完整或包含无效数据')
  const backup = parsed.data
  if (backup.local_schema_version > supportedSchemaVersion) {
    throw new Error('该备份来自更新版本的 TickCap，请先升级 App')
  }
  const calculatedHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    buildCanonicalJson(backup.payload),
  )
  if (calculatedHash !== backup.integrity.payload_sha256) {
    throw new Error('备份完整性校验失败，文件可能已损坏或被修改')
  }
  return backup
}

export async function prepareLocalRestore(
  db: SQLiteDatabase,
  text: string,
): Promise<LocalRestorePreview> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )
  const backup = await verifyBackup(text, versionRow?.user_version ?? 1)
  const [tags, capsules, daySeals, reports] = await Promise.all([
    db.getAllAsync<LocalVersion>('SELECT id, updated_at FROM tags'),
    db.getAllAsync<LocalVersion>('SELECT id, updated_at FROM capsules'),
    db.getAllAsync<LocalSealVersion>(
      'SELECT id, date, updated_at FROM day_seals',
    ),
    db.getAllAsync<LocalVersion>('SELECT id, updated_at FROM ai_reports'),
  ])
  const plans: RestorePlans = {
    tags: planTimestampedBackupMerge(tags, backup.payload.tables.tags),
    capsules: planTimestampedBackupMerge(
      capsules,
      backup.payload.tables.capsules,
    ),
    day_seals: planTimestampedBackupMerge(
      daySeals,
      backup.payload.tables.day_seals,
    ),
    ai_reports: planTimestampedBackupMerge(
      reports,
      backup.payload.tables.ai_reports,
    ),
  }
  return {
    backup,
    plans,
    counts: summarize(plans),
    entityCount:
      backup.payload.tables.tags.length +
      backup.payload.tables.capsules.length +
      backup.payload.tables.day_seals.length +
      backup.payload.tables.ai_reports.length,
    sealDateConflicts: findStableKeyConflicts(
      daySeals,
      backup.payload.tables.day_seals,
      (seal) => seal.date,
    ),
  }
}

async function upsertTag(
  db: SQLiteDatabase,
  decision: BackupMergeDecision<BackupTag>,
): Promise<void> {
  if (decision.action === 'skip') return
  const tag = decision.entity
  await db.runAsync(
    `INSERT INTO tags (
      id, name, emoji, color, parent_id, sort, archived_at,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, emoji=excluded.emoji, color=excluded.color,
      parent_id=excluded.parent_id, sort=excluded.sort,
      archived_at=excluded.archived_at, created_at=excluded.created_at,
      updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
    tag.id,
    tag.name,
    tag.emoji,
    tag.color,
    tag.parent_id,
    tag.sort,
    tag.archived_at,
    tag.created_at,
    tag.updated_at,
    tag.deleted_at,
  )
}

async function upsertCapsule(
  db: SQLiteDatabase,
  decision: BackupMergeDecision<CapsuleEntity>,
): Promise<void> {
  if (decision.action === 'skip') return
  const capsule = decision.entity
  await db.runAsync(
    `INSERT INTO capsules (
      id, date, start_at, end_at, tag_ids_json, summary, detail, mood,
      source, status, is_highlight, is_private, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date, start_at=excluded.start_at, end_at=excluded.end_at,
      tag_ids_json=excluded.tag_ids_json, summary=excluded.summary,
      detail=excluded.detail, mood=excluded.mood, source=excluded.source,
      status=excluded.status, is_highlight=excluded.is_highlight,
      is_private=excluded.is_private, created_at=excluded.created_at,
      updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
    capsule.id,
    capsule.date,
    capsule.start_at,
    capsule.end_at,
    JSON.stringify(capsule.tag_ids),
    capsule.summary ?? null,
    capsule.detail ?? null,
    capsule.mood ?? null,
    capsule.source,
    capsule.status,
    capsule.is_highlight ? 1 : 0,
    capsule.is_private ? 1 : 0,
    capsule.created_at,
    capsule.updated_at,
    capsule.deleted_at,
  )
}

async function upsertDaySeal(
  db: SQLiteDatabase,
  decision: BackupMergeDecision<DaySealEntity>,
): Promise<void> {
  if (decision.action === 'skip') return
  const seal = decision.entity
  await db.runAsync(
    `INSERT INTO day_seals (
      id, date, sealed_at, first_sealed_at, note, streak,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date, sealed_at=excluded.sealed_at,
      first_sealed_at=excluded.first_sealed_at, note=excluded.note,
      streak=excluded.streak, created_at=excluded.created_at,
      updated_at=excluded.updated_at, deleted_at=excluded.deleted_at`,
    seal.id,
    seal.date,
    seal.sealed_at,
    seal.first_sealed_at,
    seal.note,
    seal.streak,
    seal.created_at,
    seal.updated_at,
    seal.deleted_at,
  )
}

async function upsertReport(
  db: SQLiteDatabase,
  decision: BackupMergeDecision<AiReportEntity>,
): Promise<void> {
  if (decision.action === 'skip') return
  const report = decision.entity
  await db.runAsync(
    `INSERT INTO ai_reports (
      id, type, period_start, period_end, template_id, persona,
      content_md, edited_md, model, prompt_version, input_tokens,
      output_tokens, status, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type=excluded.type, period_start=excluded.period_start,
      period_end=excluded.period_end, template_id=excluded.template_id,
      persona=excluded.persona, content_md=excluded.content_md,
      edited_md=excluded.edited_md, model=excluded.model,
      prompt_version=excluded.prompt_version, input_tokens=excluded.input_tokens,
      output_tokens=excluded.output_tokens, status=excluded.status,
      created_at=excluded.created_at, updated_at=excluded.updated_at,
      deleted_at=excluded.deleted_at`,
    report.id,
    report.type,
    report.period_start,
    report.period_end,
    report.template_id,
    report.persona,
    report.content_md,
    report.edited_md,
    report.model,
    report.prompt_version,
    report.input_tokens,
    report.output_tokens,
    report.status,
    report.created_at,
    report.updated_at,
    report.deleted_at,
  )
}

async function restorePreferences(
  db: SQLiteDatabase,
  backup: LocalBackup,
): Promise<void> {
  const preferences = backup.payload.preferences
  const rows = [
    ['time_settings', preferences.time_settings],
    ['onboarding_preferences', preferences.onboarding_preferences],
    [
      'appearance_preferences',
      {
        visualTheme: preferences.appearance_preferences.visual_theme,
        colorScheme: preferences.appearance_preferences.color_scheme,
      },
    ],
  ] as const
  for (const [key, value] of rows) {
    await db.runAsync(
      `INSERT INTO local_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      key,
      JSON.stringify(value),
    )
  }
}

async function saveRecoveryBackup(
  content: string,
  now: Date,
): Promise<string> {
  const directory = new Directory(Paths.document, 'recovery')
  directory.create({ idempotent: true, intermediates: true })
  const timestamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const file = new File(
    directory,
    `tickcap-before-restore-${timestamp}.json`,
  )
  file.create({ intermediates: true })
  file.write(content)
  return file.uri
}

export async function applyLocalRestore(
  db: SQLiteDatabase,
  preview: LocalRestorePreview,
  appVersion: string,
  now = new Date(),
): Promise<LocalRestoreResult> {
  if (preview.sealDateConflicts.length > 0) {
    throw new Error('封存日期存在稳定 ID 冲突，未进行任何写入')
  }
  const recoveryBackupUri = await saveRecoveryBackup(
    await buildLocalBackup(db, appVersion, now),
    now,
  )
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync('PRAGMA defer_foreign_keys = ON;')
    for (const decision of preview.plans.tags) {
      await upsertTag(transaction, decision)
    }
    for (const decision of preview.plans.capsules) {
      await upsertCapsule(transaction, decision)
    }
    for (const decision of preview.plans.day_seals) {
      await upsertDaySeal(transaction, decision)
    }
    for (const decision of preview.plans.ai_reports) {
      await upsertReport(transaction, decision)
    }
    await restorePreferences(transaction, preview.backup)
  })
  return { counts: preview.counts, recoveryBackupUri }
}
