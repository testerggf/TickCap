import { z } from 'zod'
import { isoDateTimeSchema, uuidV7Schema } from './primitives'

export const productEventNameSchema = z.enum([
  'app_open',
  'record_start',
  'record_done',
  'capsule_edit',
  'capsule_delete',
  'gap_backfill',
  'seal_start',
  'seal_done',
  'report_view',
  'report_edit',
  'report_regenerate',
  'report_fallback_shown',
  'reminder_sent',
  'reminder_click',
  'notification_permission',
  'paywall_view',
  'paywall_convert',
  'a2hs_prompt',
  'a2hs_done',
  'onboarding_step',
  'export_done',
  'login_done',
  'signup_done',
])

const eventPropSchema = z.union([
  z.string().max(256),
  z.number().finite(),
  z.boolean(),
  z.null(),
])

export const productEventPropsSchema = z.record(
  z.string().min(1).max(64),
  eventPropSchema,
)

export const eventOutboxRecordSchema = z
  .object({
    id: uuidV7Schema,
    name: productEventNameSchema,
    props: productEventPropsSchema,
    ts: isoDateTimeSchema,
    attempts: z.number().int().nonnegative(),
  })
  .strict()

export type ProductEventName = z.infer<typeof productEventNameSchema>
export type ProductEventProps = z.infer<typeof productEventPropsSchema>
export type EventOutboxRecord = z.infer<typeof eventOutboxRecordSchema>
