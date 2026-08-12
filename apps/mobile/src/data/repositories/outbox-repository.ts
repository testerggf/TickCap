import type { SQLiteDatabase } from 'expo-sqlite'
import {
  outboxRecordSchema,
  type OutboxRecord,
} from '@tickcap/api'
import { createUuidV7 } from '../ids'

export interface BuildOutboxInput {
  entityType: string
  entityId: string
  action: OutboxRecord['action']
  baseUpdatedAt: string | null
  clientUpdatedAt: string
  changedFields: string[]
  payload: Record<string, unknown>
}

export async function buildOutboxRecord(
  input: BuildOutboxInput,
): Promise<OutboxRecord> {
  return outboxRecordSchema.parse({
    op_id: await createUuidV7(),
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    base_updated_at: input.baseUpdatedAt,
    client_updated_at: input.clientUpdatedAt,
    changed_fields: input.changedFields,
    payload: input.payload,
    attempts: 0,
    next_retry_at: null,
    created_at: input.clientUpdatedAt,
  })
}

export async function enqueueOutbox(
  transaction: SQLiteDatabase,
  record: OutboxRecord,
): Promise<void> {
  await transaction.runAsync(
    `INSERT INTO outbox (
      op_id, entity_type, entity_id, action, base_updated_at, client_updated_at,
      changed_fields_json, payload_json, attempts, next_retry_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.op_id,
    record.entity_type,
    record.entity_id,
    record.action,
    record.base_updated_at,
    record.client_updated_at,
    JSON.stringify(record.changed_fields),
    JSON.stringify(record.payload),
    record.attempts,
    record.next_retry_at,
    record.created_at,
  )
}
