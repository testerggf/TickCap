import { z } from 'zod'
import {
  dateStringSchema,
  isoDateTimeSchema,
  uuidSchema,
} from './primitives'

export const daySealEntitySchema = z
  .object({
    id: uuidSchema,
    date: dateStringSchema,
    sealed_at: isoDateTimeSchema,
    first_sealed_at: isoDateTimeSchema,
    note: z.string().max(2_000).nullable(),
    streak: z.number().int().positive(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
    deleted_at: isoDateTimeSchema.nullable(),
  })
  .strict()

export const reportTypeSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
])

export const reportStatusSchema = z.enum([
  'pending',
  'streaming',
  'done',
  'failed',
])

export const aiReportEntitySchema = z
  .object({
    id: uuidSchema,
    type: reportTypeSchema,
    period_start: dateStringSchema,
    period_end: dateStringSchema,
    template_id: uuidSchema.nullable(),
    persona: z.string().max(100).nullable(),
    content_md: z.string().nullable(),
    edited_md: z.string().nullable(),
    model: z.string().max(100).nullable(),
    prompt_version: z.string().max(100).nullable(),
    input_tokens: z.number().int().nonnegative().nullable(),
    output_tokens: z.number().int().nonnegative().nullable(),
    status: reportStatusSchema,
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
    deleted_at: isoDateTimeSchema.nullable(),
  })
  .strict()

export type DaySealEntity = z.infer<typeof daySealEntitySchema>
export type AiReportEntity = z.infer<typeof aiReportEntitySchema>
