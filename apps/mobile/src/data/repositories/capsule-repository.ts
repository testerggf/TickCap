import type { SQLiteDatabase } from 'expo-sqlite'
import {
  capsuleEntitySchema,
  type CapsuleEntity,
} from '@tickcap/api'
import {
  attributeDate,
  inferTimes,
  logicalToday,
  type UserTimeSettings,
} from '@tickcap/core'
import { createUuidV7 } from '../ids'
import {
  buildOutboxRecord,
  enqueueOutbox,
} from './outbox-repository'
import {
  buildEventRecord,
  enqueueEvent,
} from './event-repository'

interface CapsuleRow {
  id: string
  date: string
  start_at: string
  end_at: string
  tag_ids_json: string
  summary: string | null
  detail: string | null
  mood: number | null
  source: CapsuleEntity['source']
  status: CapsuleEntity['status']
  is_highlight: number
  is_private: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateCapsuleInput {
  startAt?: Date
  endAt?: Date
  summary?: string | null
  detail?: string | null
  tagIds?: string[]
  mood?: number | null
  isHighlight?: boolean
  isPrivate?: boolean
  source?: CapsuleEntity['source']
  elapsedMs?: number
  onboardingFirstTag?: string
  recordEntry?:
    | 'quick_tag'
    | 'text'
    | 'onboarding'
    | 'gap'
    | 'notification'
  notificationOperationKey?: string
}

export interface UpdateCapsuleInput {
  summary?: string | null
  detail?: string | null
  mood?: number | null
  isHighlight?: boolean
  isPrivate?: boolean
}

const INSERT_CAPSULE_SQL = `
  INSERT INTO capsules (
    id, date, start_at, end_at, tag_ids_json, summary, detail, mood,
    source, status, is_highlight, is_private, created_at, updated_at, deleted_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

function toCapsule(row: CapsuleRow): CapsuleEntity {
  return capsuleEntitySchema.parse({
    id: row.id,
    date: row.date,
    start_at: row.start_at,
    end_at: row.end_at,
    tag_ids: JSON.parse(row.tag_ids_json) as unknown,
    summary: row.summary,
    detail: row.detail,
    mood: row.mood,
    source: row.source,
    status: row.status,
    is_highlight: row.is_highlight === 1,
    is_private: row.is_private === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  })
}

function capsuleValues(capsule: CapsuleEntity): (string | number | null)[] {
  return [
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
  ]
}

export async function createCapsule(
  db: SQLiteDatabase,
  input: CreateCapsuleInput,
  settings: UserTimeSettings,
  now = new Date(),
): Promise<CapsuleEntity> {
  const notificationMetaKey = input.notificationOperationKey
    ? `notification_action:${input.notificationOperationKey}`
    : null
  if (notificationMetaKey) {
    const existingOperation = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM local_meta WHERE key = ?',
      notificationMetaKey,
    )
    if (existingOperation) {
      const existing = await db.getFirstAsync<CapsuleRow>(
        'SELECT * FROM capsules WHERE id = ?',
        existingOperation.value,
      )
      if (!existing) throw new Error('通知记录幂等状态不完整')
      return toCapsule(existing)
    }
  }
  const hasExplicitStart = input.startAt !== undefined
  const hasExplicitEnd = input.endAt !== undefined
  if (hasExplicitStart !== hasExplicitEnd) {
    throw new Error('补记必须同时提供开始和结束时间')
  }

  let span: { startAt: Date; endAt: Date }
  if (input.startAt && input.endAt) {
    span = { startAt: input.startAt, endAt: input.endAt }
  } else {
    const today = logicalToday(now, settings)
    const last = await db.getFirstAsync<{ end_at: string }>(
      `SELECT end_at FROM capsules
       WHERE date = ? AND deleted_at IS NULL
       ORDER BY end_at DESC LIMIT 1`,
      today,
    )
    span = inferTimes({
      now,
      lastCapsuleEndAt: last ? new Date(last.end_at) : null,
      settings,
    })
  }
  const timestamp = now.toISOString()
  const capsule = capsuleEntitySchema.parse({
    id: await createUuidV7(now.getTime()),
    date: attributeDate(span.startAt, settings),
    start_at: span.startAt.toISOString(),
    end_at: span.endAt.toISOString(),
    tag_ids: input.tagIds ?? [],
    summary: input.summary?.trim() || null,
    detail: input.detail?.trim() || null,
    mood: input.mood ?? null,
    source: input.source ?? 'manual',
    status: 'confirmed',
    is_highlight: input.isHighlight ?? false,
    is_private: input.isPrivate ?? false,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  })
  const outbox = await buildOutboxRecord({
    entityType: 'capsule',
    entityId: capsule.id,
    action: 'upsert',
    baseUpdatedAt: null,
    clientUpdatedAt: capsule.updated_at,
    changedFields: [
      'date',
      'start_at',
      'end_at',
      'tag_ids',
      'summary',
      'detail',
      'mood',
      'source',
      'status',
      'is_highlight',
      'is_private',
    ],
    payload: capsule,
  })
  const durationMin = Math.max(
    1,
    Math.round(
      (new Date(capsule.end_at).getTime() -
        new Date(capsule.start_at).getTime()) /
        60_000,
    ),
  )
  const recordDoneEvent = await buildEventRecord('record_done', {
    source: capsule.source,
    entry:
      input.recordEntry ??
      (capsule.source === 'backfill' ? 'gap' : capsule.source),
    tag_count: capsule.tag_ids.length,
    has_summary: capsule.summary !== null,
    has_detail: capsule.detail !== null,
    has_mood: capsule.mood !== null,
    duration_min: durationMin,
    elapsed_ms: Math.max(0, Math.round(input.elapsedMs ?? 0)),
  }, now)
  const gapEvent =
    capsule.source === 'backfill'
      ? await buildEventRecord('gap_backfill', { gap_minutes: durationMin }, now)
      : null
  const onboardingEvent =
    capsule.source === 'onboarding'
      ? await buildEventRecord(
          'onboarding_step',
          {
            step: 2,
            first_tag: input.onboardingFirstTag ?? 'unknown',
          },
          now,
        )
      : null
  const reminderClickEvent = notificationMetaKey
    ? await buildEventRecord(
        'reminder_click',
        { channel: 'local', snooze_level: 0, action: 'quick_tag' },
        now,
      )
    : null

  let duplicateCapsuleId: string | null = null
  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (notificationMetaKey) {
      const operation = await transaction.runAsync(
        'INSERT OR IGNORE INTO local_meta (key, value) VALUES (?, ?)',
        notificationMetaKey,
        capsule.id,
      )
      if (operation.changes === 0) {
        const existing = await transaction.getFirstAsync<{ value: string }>(
          'SELECT value FROM local_meta WHERE key = ?',
          notificationMetaKey,
        )
        duplicateCapsuleId = existing?.value ?? null
        return
      }
    }
    await transaction.runAsync(INSERT_CAPSULE_SQL, ...capsuleValues(capsule))
    await enqueueOutbox(transaction, outbox)
    await enqueueEvent(transaction, recordDoneEvent)
    if (gapEvent) await enqueueEvent(transaction, gapEvent)
    if (onboardingEvent) await enqueueEvent(transaction, onboardingEvent)
    if (reminderClickEvent) {
      await enqueueEvent(transaction, reminderClickEvent)
    }
  })
  if (duplicateCapsuleId) {
    const existing = await db.getFirstAsync<CapsuleRow>(
      'SELECT * FROM capsules WHERE id = ?',
      duplicateCapsuleId,
    )
    if (!existing) throw new Error('通知记录幂等状态不完整')
    return toCapsule(existing)
  }
  return capsule
}

export async function createNotificationCapsule(
  db: SQLiteDatabase,
  input: { tagId: string; operationKey: string },
  settings: UserTimeSettings,
  now = new Date(),
): Promise<CapsuleEntity> {
  return createCapsule(
    db,
    {
      tagIds: [input.tagId],
      source: 'notification',
      recordEntry: 'notification',
      elapsedMs: 0,
      notificationOperationKey: input.operationKey,
    },
    settings,
    now,
  )
}

export async function listCapsulesByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<CapsuleEntity[]> {
  const rows = await db.getAllAsync<CapsuleRow>(
    `SELECT * FROM capsules
     WHERE date = ? AND deleted_at IS NULL
     ORDER BY start_at DESC, id DESC`,
    date,
  )
  return rows.map(toCapsule)
}

export async function updateCapsule(
  db: SQLiteDatabase,
  id: string,
  input: UpdateCapsuleInput,
  now = new Date(),
): Promise<CapsuleEntity> {
  const row = await db.getFirstAsync<CapsuleRow>(
    'SELECT * FROM capsules WHERE id = ? AND deleted_at IS NULL',
    id,
  )
  if (!row) throw new Error('胶囊不存在或已删除')

  const previous = toCapsule(row)
  const fields: string[] = []
  const changes: Partial<CapsuleEntity> = {}
  const assign = <K extends keyof UpdateCapsuleInput>(
    key: K,
    entityKey: keyof CapsuleEntity,
  ) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      fields.push(String(entityKey))
      Object.assign(changes, { [entityKey]: input[key] })
    }
  }
  assign('summary', 'summary')
  assign('detail', 'detail')
  assign('mood', 'mood')
  assign('isHighlight', 'is_highlight')
  assign('isPrivate', 'is_private')
  if (fields.length === 0) return previous

  const nextSummary = Object.prototype.hasOwnProperty.call(input, 'summary')
    ? typeof input.summary === 'string'
      ? input.summary.trim() || null
      : input.summary ?? null
    : previous.summary
  const nextDetail = Object.prototype.hasOwnProperty.call(input, 'detail')
    ? typeof input.detail === 'string'
      ? input.detail.trim() || null
      : input.detail ?? null
    : previous.detail
  const capsule = capsuleEntitySchema.parse({
    ...previous,
    ...changes,
    summary: nextSummary,
    detail: nextDetail,
    updated_at: now.toISOString(),
  })
  const outbox = await buildOutboxRecord({
    entityType: 'capsule',
    entityId: capsule.id,
    action: 'upsert',
    baseUpdatedAt: previous.updated_at,
    clientUpdatedAt: capsule.updated_at,
    changedFields: fields,
    payload: capsule,
  })
  const event = await buildEventRecord(
    'capsule_edit',
    { field: fields.join(',') },
    now,
  )

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `UPDATE capsules SET
        summary = ?, detail = ?, mood = ?, is_highlight = ?, is_private = ?, updated_at = ?
       WHERE id = ?`,
      capsule.summary ?? null,
      capsule.detail ?? null,
      capsule.mood ?? null,
      capsule.is_highlight ? 1 : 0,
      capsule.is_private ? 1 : 0,
      capsule.updated_at,
      capsule.id,
    )
    await enqueueOutbox(transaction, outbox)
    await enqueueEvent(transaction, event)
  })
  return capsule
}

export async function softDeleteCapsule(
  db: SQLiteDatabase,
  id: string,
  now = new Date(),
): Promise<CapsuleEntity> {
  const row = await db.getFirstAsync<CapsuleRow>(
    'SELECT * FROM capsules WHERE id = ? AND deleted_at IS NULL',
    id,
  )
  if (!row) throw new Error('胶囊不存在或已删除')

  const previous = toCapsule(row)
  const timestamp = now.toISOString()
  const capsule = capsuleEntitySchema.parse({
    ...previous,
    updated_at: timestamp,
    deleted_at: timestamp,
  })
  const outbox = await buildOutboxRecord({
    entityType: 'capsule',
    entityId: capsule.id,
    action: 'delete',
    baseUpdatedAt: previous.updated_at,
    clientUpdatedAt: capsule.updated_at,
    changedFields: ['deleted_at'],
    payload: capsule,
  })
  const event = await buildEventRecord(
    'capsule_delete',
    { field: 'capsule' },
    now,
  )

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'UPDATE capsules SET deleted_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      id,
    )
    await enqueueOutbox(transaction, outbox)
    await enqueueEvent(transaction, event)
  })
  return capsule
}
