import { z } from 'zod'
import {
  dateStringSchema,
  entityPayloadSchema,
  isoDateTimeSchema,
  uuidSchema,
} from './primitives'

export const capsuleSourceSchema = z.enum([
  'manual',
  'backfill',
  'onboarding',
  'notification',
  'calendar_draft',
])

export const capsuleStatusSchema = z.enum(['draft', 'confirmed'])

const capsuleEntityBaseSchema = z
  .object({
    id: uuidSchema,
    date: dateStringSchema,
    start_at: isoDateTimeSchema,
    end_at: isoDateTimeSchema,
    tag_ids: z.array(uuidSchema).max(12),
    summary: z.string().max(200).nullable().optional(),
    detail: z.string().max(10_000).nullable().optional(),
    mood: z.number().int().min(1).max(5).nullable().optional(),
    source: capsuleSourceSchema,
    status: capsuleStatusSchema,
    is_highlight: z.boolean(),
    is_private: z.boolean(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
    deleted_at: isoDateTimeSchema.nullable(),
  })
  .strict()

const endAfterStart = (capsule: { start_at: string; end_at: string }) =>
  new Date(capsule.end_at).getTime() > new Date(capsule.start_at).getTime()

export const capsuleEntitySchema = capsuleEntityBaseSchema.refine(endAfterStart, {
  message: 'end_at 必须晚于 start_at',
  path: ['end_at'],
}).refine(
  (capsule) =>
    new Date(capsule.end_at).getTime() - new Date(capsule.start_at).getTime() <=
    24 * 60 * 60 * 1000,
  {
    message: '胶囊时长不能超过 24 小时',
    path: ['end_at'],
  },
)

export const capsuleCreateSchema = capsuleEntityBaseSchema
  .pick({
    id: true,
    start_at: true,
    end_at: true,
    tag_ids: true,
    summary: true,
    detail: true,
    mood: true,
    source: true,
    is_highlight: true,
    is_private: true,
  })
  .partial({
    summary: true,
    detail: true,
    mood: true,
    is_highlight: true,
    is_private: true,
  })
  .refine(endAfterStart, {
    message: 'end_at 必须晚于 start_at',
    path: ['end_at'],
  })
  .refine(
    (capsule) =>
      new Date(capsule.end_at).getTime() -
        new Date(capsule.start_at).getTime() <=
      24 * 60 * 60 * 1000,
    {
      message: '胶囊时长不能超过 24 小时',
      path: ['end_at'],
    },
  )

export const capsuleEnvelopeSchema = z
  .object({ capsule: capsuleEntitySchema })
  .strict()

export type CapsuleEntity = z.infer<typeof capsuleEntitySchema>
export type CapsuleCreate = z.infer<typeof capsuleCreateSchema>

// 保留给 entity-agnostic 同步层使用，业务入口仍应优先解析 capsuleEntitySchema。
export const capsulePayloadSchema = entityPayloadSchema
