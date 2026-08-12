import { z } from 'zod'
import {
  entityFieldSchema,
  entityPayloadSchema,
  entityTypeSchema,
  isoDateTimeSchema,
  uuidSchema,
  uuidV7Schema,
} from './primitives'

export const syncActionSchema = z.enum(['upsert', 'delete'])

const changedFieldsSchema = z
  .array(entityFieldSchema)
  .max(64)
  .refine((fields) => new Set(fields).size === fields.length, {
    message: 'changed_fields 不能重复',
  })

export const syncOperationSchema = z
  .object({
    op_id: uuidV7Schema,
    entity_type: entityTypeSchema,
    entity_id: uuidSchema,
    action: syncActionSchema,
    base_updated_at: isoDateTimeSchema.optional(),
    client_updated_at: isoDateTimeSchema,
    changed_fields: changedFieldsSchema,
    payload: entityPayloadSchema,
  })
  .strict()
  .superRefine((operation, context) => {
    if (operation.action === 'upsert' && operation.changed_fields.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'upsert 至少需要一个 changed_field',
        path: ['changed_fields'],
      })
    }
  })

export const syncPushRequestSchema = z
  .object({
    device_id: z.string().min(1).max(128),
    operations: z.array(syncOperationSchema).min(1).max(100),
  })
  .strict()

export const detailConflictSchema = z
  .object({
    type: z.literal('field_conflict'),
    field: z.literal('detail'),
    local_value: z.unknown(),
    server_value: z.unknown(),
    server_updated_at: isoDateTimeSchema,
  })
  .strict()

export const syncErrorSchema = z
  .object({
    code: z.string().min(1).max(64),
    message: z.string().min(1).max(500),
    fields: z.record(z.string(), z.string()).optional(),
  })
  .strict()

const acceptedResultSchema = z
  .object({
    op_id: uuidV7Schema,
    status: z.literal('accepted'),
    entity: entityPayloadSchema,
  })
  .strict()

const conflictResultSchema = z
  .object({
    op_id: uuidV7Schema,
    status: z.literal('conflict'),
    entity: entityPayloadSchema.optional(),
    conflict: detailConflictSchema,
  })
  .strict()

const rejectedResultSchema = z
  .object({
    op_id: uuidV7Schema,
    status: z.literal('rejected'),
    error: syncErrorSchema,
  })
  .strict()

export const syncPushResultSchema = z.discriminatedUnion('status', [
  acceptedResultSchema,
  conflictResultSchema,
  rejectedResultSchema,
])

export const syncPushResponseSchema = z
  .object({
    results: z.array(syncPushResultSchema),
    server_time: isoDateTimeSchema,
  })
  .strict()

export const syncChangeSchema = z
  .object({
    seq: z.string().regex(/^\d+$/),
    entity_type: entityTypeSchema,
    entity_id: uuidSchema,
    action: syncActionSchema,
    changed_fields: changedFieldsSchema,
    payload: entityPayloadSchema,
    changed_at: isoDateTimeSchema,
  })
  .strict()

export const syncPullResponseSchema = z
  .object({
    changes: z.array(syncChangeSchema).max(500),
    next_cursor: z.string(),
    has_more: z.boolean(),
    server_time: isoDateTimeSchema,
  })
  .strict()

export type SyncOperation = z.infer<typeof syncOperationSchema>
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>
export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>
