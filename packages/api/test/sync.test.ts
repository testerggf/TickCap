import { describe, expect, it } from 'vitest'
import {
  detailConflictSchema,
  syncPullResponseSchema,
  syncPushRequestSchema,
  syncPushResponseSchema,
  uuidV7Schema,
} from '../src'

const OP_ID = '019fae57-cb8b-7470-b1c3-ef7fe9452e35'
const ENTITY_ID = '019fae58-1dd2-7a51-a8e0-5f21268f3f9e'

describe('同步契约（07 §4）', () => {
  it('只接受 UUID v7 operation id', () => {
    expect(uuidV7Schema.safeParse(OP_ID).success).toBe(true)
    expect(
      uuidV7Schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
    ).toBe(false)
  })

  it('push 限制 100 条且拒绝重复 changed_fields', () => {
    const operation = {
      op_id: OP_ID,
      entity_type: 'capsule',
      entity_id: ENTITY_ID,
      action: 'upsert',
      client_updated_at: '2026-07-29T15:00:00.000Z',
      changed_fields: ['detail'],
      payload: { detail: '本地版本' },
    } as const

    expect(
      syncPushRequestSchema.safeParse({
        device_id: 'ios-test-device',
        operations: [operation],
      }).success,
    ).toBe(true)
    expect(
      syncPushRequestSchema.safeParse({
        device_id: 'ios-test-device',
        operations: [
          { ...operation, changed_fields: ['detail', 'detail'] },
        ],
      }).success,
    ).toBe(false)
    expect(
      syncPushRequestSchema.safeParse({
        device_id: 'ios-test-device',
        operations: Array.from({ length: 101 }, () => operation),
      }).success,
    ).toBe(false)
  })

  it('detail 冲突必须同时携带 local/server 两个版本', () => {
    expect(
      detailConflictSchema.safeParse({
        type: 'field_conflict',
        field: 'detail',
        local_value: '本地草稿',
        server_value: '服务端版本',
        server_updated_at: '2026-07-29T15:00:00.000Z',
      }).success,
    ).toBe(true)
    expect(
      detailConflictSchema.safeParse({
        type: 'field_conflict',
        field: 'detail',
        local_value: '本地草稿',
        server_updated_at: '2026-07-29T15:00:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('push 响应按 status 收窄并拒绝形状混用', () => {
    expect(
      syncPushResponseSchema.safeParse({
        results: [
          {
            op_id: OP_ID,
            status: 'accepted',
            entity: { id: ENTITY_ID, updated_at: '2026-07-29T15:00:00.000Z' },
          },
        ],
        server_time: '2026-07-29T15:00:01.000Z',
      }).success,
    ).toBe(true)
    expect(
      syncPushResponseSchema.safeParse({
        results: [{ op_id: OP_ID, status: 'rejected' }],
        server_time: '2026-07-29T15:00:01.000Z',
      }).success,
    ).toBe(false)
  })

  it('pull cursor 保持不透明', () => {
    const result = syncPullResponseSchema.parse({
      changes: [
        {
          seq: '9007199254740993',
          entity_type: 'capsule',
          entity_id: ENTITY_ID,
          action: 'delete',
          changed_fields: ['deleted_at'],
          payload: { deleted_at: '2026-07-29T15:00:00.000Z' },
          changed_at: '2026-07-29T15:00:00.000Z',
        },
      ],
      next_cursor: 'opaque:9007199254740993',
      has_more: false,
      server_time: '2026-07-29T15:00:01.000Z',
    })
    expect(result.next_cursor).toBe('opaque:9007199254740993')
  })
})
