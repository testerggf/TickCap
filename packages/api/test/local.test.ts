import { describe, expect, it } from 'vitest'
import {
  LOCAL_SCHEMA_VERSION,
  localMetaSchema,
  onboardingPreferencesSchema,
  outboxRecordSchema,
  syncStateSchema,
} from '../src'

describe('iOS 本地数据与同步状态契约（07 §5A）', () => {
  it('schema version 与 checkpoint 必须显式存在', () => {
    expect(
      localMetaSchema.safeParse({
        schema_version: LOCAL_SCHEMA_VERSION,
        device_id: 'ios-device',
        sync_cursor: null,
        last_sync_at: null,
      }).success,
    ).toBe(true)
  })

  it('同步状态使用闭集', () => {
    expect(syncStateSchema.safeParse('retry_wait').success).toBe(true)
    expect(syncStateSchema.safeParse('unknown').success).toBe(false)
  })

  it('outbox 使用 UUID v7 op_id 且保留重试字段', () => {
    expect(
      outboxRecordSchema.safeParse({
        op_id: '019fae57-cb8b-7470-b1c3-ef7fe9452e35',
        entity_type: 'capsule',
        entity_id: '019fae58-1dd2-7a51-a8e0-5f21268f3f9e',
        action: 'upsert',
        base_updated_at: null,
        client_updated_at: '2026-07-29T15:00:00.000Z',
        changed_fields: ['summary'],
        payload: { summary: '记录' },
        attempts: 0,
        next_retry_at: null,
        created_at: '2026-07-29T15:00:00.000Z',
      }).success,
    ).toBe(true)
  })

  it('Onboarding 只保存闭集提醒偏好，不包含通知权限状态', () => {
    expect(
      onboardingPreferencesSchema.safeParse({
        completed: true,
        reminder_interval_min: 60,
        seal_reminder_min: 21 * 60 + 30,
      }).success,
    ).toBe(true)
    expect(
      onboardingPreferencesSchema.safeParse({
        completed: true,
        reminder_interval_min: 45,
        seal_reminder_min: 21 * 60 + 30,
      }).success,
    ).toBe(false)
  })
})
