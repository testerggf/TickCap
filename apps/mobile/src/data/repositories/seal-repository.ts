import type { SQLiteDatabase } from 'expo-sqlite'
import {
  aiReportEntitySchema,
  daySealEntitySchema,
  type AiReportEntity,
  type CapsuleEntity,
  type DaySealEntity,
} from '@tickcap/api'
import {
  buildDailyContext,
  buildLocalDailyReview,
  computeStreak,
  shiftDateString,
  type UserTimeSettings,
} from '@tickcap/core'
import { createUuidV7 } from '../ids'
import { listCapsulesByDate } from './capsule-repository'
import {
  buildOutboxRecord,
  enqueueOutbox,
} from './outbox-repository'
import {
  buildEventRecord,
  enqueueEvent,
} from './event-repository'

interface SealRow {
  id: string
  date: string
  sealed_at: string
  first_sealed_at: string
  note: string | null
  streak: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface ReportRow {
  id: string
  type: AiReportEntity['type']
  period_start: string
  period_end: string
  template_id: string | null
  persona: string | null
  content_md: string | null
  edited_md: string | null
  model: string | null
  prompt_version: string | null
  input_tokens: number | null
  output_tokens: number | null
  status: AiReportEntity['status']
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SealPreview {
  date: string
  streak: number
  capsuleCount: number
  contentMd: string
}

export interface SealResult {
  seal: DaySealEntity
  report: AiReportEntity
}

function toSeal(row: SealRow): DaySealEntity {
  return daySealEntitySchema.parse(row)
}

function toReport(row: ReportRow): AiReportEntity {
  return aiReportEntitySchema.parse(row)
}

export async function getSealByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<DaySealEntity | null> {
  const row = await db.getFirstAsync<SealRow>(
    'SELECT * FROM day_seals WHERE date = ? AND deleted_at IS NULL',
    date,
  )
  return row ? toSeal(row) : null
}

async function getAnySealByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<DaySealEntity | null> {
  const row = await db.getFirstAsync<SealRow>(
    'SELECT * FROM day_seals WHERE date = ?',
    date,
  )
  return row ? toSeal(row) : null
}

function capsuleTags(
  capsule: CapsuleEntity,
  resolveTagName: (id: string) => string,
): string[] {
  const tags = capsule.tag_ids.map(resolveTagName)
  return tags.length ? tags : ['记录']
}

export async function prepareSealDay(
  db: SQLiteDatabase,
  date: string,
  settings: UserTimeSettings,
  resolveTagName: (id: string) => string,
): Promise<SealPreview> {
  if (await getSealByDate(db, date)) throw new Error('这一天已经封存')
  const capsules = await listCapsulesByDate(db, date)
  if (capsules.length === 0) throw new Error('至少记录一颗胶囊才能封存')

  const existing = await getAnySealByDate(db, date)
  const previous = await getAnySealByDate(db, shiftDateString(date, -1))
  const streak =
    existing?.streak ??
    computeStreak(
      previous
        ? {
            date: previous.date,
            firstSealedAt: new Date(previous.first_sealed_at),
            streak: previous.streak,
          }
        : null,
      date,
      settings,
    )
  const context = buildDailyContext({
    date,
    timezone: settings.timezone,
    streak,
    capsules: capsules.map((capsule) => ({
      startAt: new Date(capsule.start_at),
      endAt: new Date(capsule.end_at),
      tags: capsuleTags(capsule, resolveTagName),
      summary: capsule.summary ?? undefined,
      detail: capsule.detail ?? undefined,
      mood: capsule.mood ?? undefined,
      isHighlight: capsule.is_highlight,
      isPrivate: capsule.is_private,
    })),
  })
  return {
    date,
    streak,
    capsuleCount: capsules.length,
    contentMd: buildLocalDailyReview(context),
  }
}

export async function sealDay(
  db: SQLiteDatabase,
  date: string,
  note: string,
  settings: UserTimeSettings,
  resolveTagName: (id: string) => string,
  now = new Date(),
): Promise<SealResult> {
  const preview = await prepareSealDay(db, date, settings, resolveTagName)
  const existing = await getAnySealByDate(db, date)
  const timestamp = now.toISOString()
  const seal = daySealEntitySchema.parse({
    id: existing?.id ?? (await createUuidV7(now.getTime())),
    date,
    sealed_at: timestamp,
    first_sealed_at: existing?.first_sealed_at ?? timestamp,
    note: note.trim() || existing?.note || null,
    streak: preview.streak,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
    deleted_at: null,
  })
  const report = aiReportEntitySchema.parse({
    id: await createUuidV7(now.getTime()),
    type: 'daily',
    period_start: date,
    period_end: date,
    template_id: null,
    persona: null,
    content_md: preview.contentMd,
    edited_md: null,
    model: 'local',
    prompt_version: 'local-v1',
    input_tokens: null,
    output_tokens: null,
    status: 'done',
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  })
  const sealOutbox = await buildOutboxRecord({
    entityType: 'day_seal',
    entityId: seal.id,
    action: 'upsert',
    baseUpdatedAt: existing?.updated_at ?? null,
    clientUpdatedAt: timestamp,
    changedFields: ['date', 'sealed_at', 'first_sealed_at', 'note', 'streak'],
    payload: seal,
  })
  const reportOutbox = await buildOutboxRecord({
    entityType: 'ai_report',
    entityId: report.id,
    action: 'upsert',
    baseUpdatedAt: null,
    clientUpdatedAt: timestamp,
    changedFields: [
      'type',
      'period_start',
      'period_end',
      'content_md',
      'model',
      'prompt_version',
      'status',
    ],
    payload: report,
  })
  const sealEvent = await buildEventRecord(
    'seal_done',
    {
      capsule_count: preview.capsuleCount,
      streak: seal.streak,
      note_filled: seal.note !== null,
      is_makeup: false,
    },
    now,
  )

  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (existing) {
      await transaction.runAsync(
        `UPDATE day_seals SET
          sealed_at = ?, first_sealed_at = ?, note = ?, streak = ?,
          updated_at = ?, deleted_at = NULL
         WHERE id = ?`,
        seal.sealed_at,
        seal.first_sealed_at,
        seal.note,
        seal.streak,
        seal.updated_at,
        seal.id,
      )
    } else {
      await transaction.runAsync(
        `INSERT INTO day_seals (
          id, date, sealed_at, first_sealed_at, note, streak,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await transaction.runAsync(
      `INSERT INTO ai_reports (
        id, type, period_start, period_end, template_id, persona, content_md,
        edited_md, model, prompt_version, input_tokens, output_tokens, status,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await enqueueOutbox(transaction, sealOutbox)
    await enqueueOutbox(transaction, reportOutbox)
    await enqueueEvent(transaction, sealEvent)
  })
  return { seal, report }
}

export async function unsealDay(
  db: SQLiteDatabase,
  date: string,
  now = new Date(),
): Promise<DaySealEntity> {
  const existing = await getSealByDate(db, date)
  if (!existing) throw new Error('这一天尚未封存')
  const timestamp = now.toISOString()
  const seal = daySealEntitySchema.parse({
    ...existing,
    updated_at: timestamp,
    deleted_at: timestamp,
  })
  const outbox = await buildOutboxRecord({
    entityType: 'day_seal',
    entityId: seal.id,
    action: 'delete',
    baseUpdatedAt: existing.updated_at,
    clientUpdatedAt: timestamp,
    changedFields: ['deleted_at'],
    payload: seal,
  })
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'UPDATE day_seals SET updated_at = ?, deleted_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      seal.id,
    )
    await enqueueOutbox(transaction, outbox)
  })
  return seal
}

export async function listDailyReports(
  db: SQLiteDatabase,
): Promise<AiReportEntity[]> {
  const rows = await db.getAllAsync<ReportRow>(
    `SELECT * FROM ai_reports
     WHERE type = 'daily' AND status = 'done' AND deleted_at IS NULL
     ORDER BY period_start DESC, created_at DESC`,
  )
  const seenDates = new Set<string>()
  return rows.map(toReport).filter((report) => {
    if (seenDates.has(report.period_start)) return false
    seenDates.add(report.period_start)
    return true
  })
}
