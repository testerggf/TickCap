import { describe, expect, it } from 'vitest'
import {
  eventOutboxRecordSchema,
  localTimeSettingsSchema,
  productEventNameSchema,
} from '../src'

describe('iOS 设置与事件契约', () => {
  it('设置分钟值必须在一天内', () => {
    expect(
      localTimeSettingsSchema.safeParse({
        timezone: 'Asia/Shanghai',
        day_boundary_min: 240,
        wake_default_min: 420,
      }).success,
    ).toBe(true)
    expect(
      localTimeSettingsSchema.safeParse({
        timezone: 'Asia/Shanghai',
        day_boundary_min: 1440,
        wake_default_min: 420,
      }).success,
    ).toBe(false)
  })

  it('事件名严格使用 09 的闭集', () => {
    expect(productEventNameSchema.safeParse('record_done').success).toBe(true)
    expect(productEventNameSchema.safeParse('capsule_content').success).toBe(false)
  })

  it('事件 outbox 只接受标量属性', () => {
    expect(
      eventOutboxRecordSchema.safeParse({
        id: '019fae57-cb8b-7470-b1c3-ef7fe9452e35',
        name: 'record_done',
        props: {
          source: 'manual',
          tag_count: 1,
          has_summary: true,
        },
        ts: '2026-07-30T12:00:00.000Z',
        attempts: 0,
      }).success,
    ).toBe(true)
    expect(
      eventOutboxRecordSchema.safeParse({
        id: '019fae57-cb8b-7470-b1c3-ef7fe9452e35',
        name: 'record_done',
        props: { summary: { forbidden: true } },
        ts: '2026-07-30T12:00:00.000Z',
        attempts: 0,
      }).success,
    ).toBe(false)
  })
})
