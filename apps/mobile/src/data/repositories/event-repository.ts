import type { SQLiteDatabase } from 'expo-sqlite'
import {
  eventOutboxRecordSchema,
  type EventOutboxRecord,
  type ProductEventName,
  type ProductEventProps,
} from '@tickcap/api'
import { assertEventPropsExcludeContent } from '@tickcap/core'
import {
  computeRecordTimingMetrics,
  type RecordTimingMetrics,
  type RecordTimingSample,
} from '@tickcap/core'
import { createUuidV7 } from '../ids'

export async function buildEventRecord(
  name: ProductEventName,
  props: ProductEventProps = {},
  now = new Date(),
): Promise<EventOutboxRecord> {
  assertEventPropsExcludeContent(props)
  return eventOutboxRecordSchema.parse({
    id: await createUuidV7(now.getTime()),
    name,
    props,
    ts: now.toISOString(),
    attempts: 0,
  })
}

export async function enqueueEvent(
  db: SQLiteDatabase,
  event: EventOutboxRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO event_outbox (id, name, props_json, ts, attempts)
     VALUES (?, ?, ?, ?, ?)`,
    event.id,
    event.name,
    JSON.stringify(event.props),
    event.ts,
    event.attempts,
  )
}

export async function trackEvent(
  db: SQLiteDatabase,
  name: ProductEventName,
  props: ProductEventProps = {},
  now = new Date(),
): Promise<void> {
  await enqueueEvent(db, await buildEventRecord(name, props, now))
}

export async function getEventOutboxCount(
  db: SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM event_outbox',
  )
  return row?.count ?? 0
}

export async function getRecordTimingMetrics(
  db: SQLiteDatabase,
  limit = 30,
): Promise<RecordTimingMetrics> {
  const rows = await db.getAllAsync<{ props_json: string }>(
    `SELECT props_json FROM event_outbox
     WHERE name = 'record_done'
     ORDER BY ts DESC, id DESC
     LIMIT ?`,
    limit,
  )
  const samples = rows.flatMap<RecordTimingSample>((row) => {
    const props = JSON.parse(row.props_json) as Record<string, unknown>
    return typeof props.elapsed_ms === 'number' &&
      typeof props.entry === 'string'
      ? [{ elapsedMs: props.elapsed_ms, entry: props.entry }]
      : []
  })
  return computeRecordTimingMetrics(samples)
}
