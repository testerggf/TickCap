import { z } from 'zod'

export const mobileFocusSchema = z.enum(['tickbar', 'timeline'])

export const tickcapDeepLinkSchema = z.string().refine(
  (value) => {
    try {
      return new URL(value).protocol === 'tickcap:'
    } catch {
      return false
    }
  },
  { message: '必须是 tickcap:// Deep Link' },
)

export const notificationDataSchema = z
  .object({
    target: tickcapDeepLinkSchema,
    notification_id: z.string().min(1).max(128).optional(),
    action_id: z.string().min(1).max(128).optional(),
    tag_id: z.string().min(1).max(128).optional(),
  })
  .passthrough()

export type NotificationData = z.infer<typeof notificationDataSchema>

export const notificationPermissionStatusSchema = z.enum([
  'not_determined',
  'denied',
  'authorized',
  'provisional',
  'ephemeral',
])

const scheduledLocalNotificationSchema = z
  .object({
    identifier: z.string().min(1).max(256),
    notification_id: z.string().min(1).max(128),
    fire_at: z.string().datetime({ offset: true }),
  })
  .strict()

export const localNotificationStatusSchema = z
  .object({
    enabled: z.boolean(),
    permission_status: notificationPermissionStatusSchema,
    permission_requested_at: z.string().datetime({ offset: true }).nullable(),
    first_seal_offer_shown: z.boolean(),
    consecutive_missed: z.number().int().nonnegative().default(0),
    snooze_level: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
    last_app_open_at: z.string().datetime({ offset: true }).nullable(),
    last_reconciled_at: z.string().datetime({ offset: true }).nullable(),
    scheduled: z
      .object({
        interval: scheduledLocalNotificationSchema.nullable(),
        seal: scheduledLocalNotificationSchema.nullable(),
      })
      .strict(),
  })
  .strict()

export type NotificationPermissionStatus = z.infer<
  typeof notificationPermissionStatusSchema
>
export type LocalNotificationStatus = z.infer<
  typeof localNotificationStatusSchema
>
