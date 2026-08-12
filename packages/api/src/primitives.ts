import { z } from 'zod'

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const uuidSchema = z.string().uuid()

export const uuidV7Schema = z
  .string()
  .regex(UUID_V7_PATTERN, '必须是 UUID v7')

export const isoDateTimeSchema = z.string().datetime({ offset: true })

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '必须是 YYYY-MM-DD')

export const entityTypeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/)

export const entityFieldSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/)

export const entityPayloadSchema = z.record(z.string(), z.unknown())
