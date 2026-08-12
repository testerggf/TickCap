import { describe, expect, it } from 'vitest'
import { capsuleCreateSchema, capsuleEntitySchema } from '../src'

const ID = '019fae58-1dd2-7a51-a8e0-5f21268f3f9e'

describe('胶囊契约（07 §3 / §4）', () => {
  it('创建请求允许通知来源并由服务端补 date/status/时间戳', () => {
    expect(
      capsuleCreateSchema.safeParse({
        id: ID,
        start_at: '2026-07-29T14:00:00.000Z',
        end_at: '2026-07-29T15:00:00.000Z',
        tag_ids: [],
        source: 'notification',
        is_private: true,
      }).success,
    ).toBe(true)
  })

  it('拒绝负时长与超过 24 小时的胶囊', () => {
    const base = {
      id: ID,
      start_at: '2026-07-29T14:00:00.000Z',
      tag_ids: [],
      source: 'manual',
    } as const

    expect(
      capsuleCreateSchema.safeParse({
        ...base,
        end_at: '2026-07-29T13:59:00.000Z',
      }).success,
    ).toBe(false)
    expect(
      capsuleCreateSchema.safeParse({
        ...base,
        end_at: '2026-07-30T14:01:00.000Z',
      }).success,
    ).toBe(false)
  })

  it('服务端实体必须带软删除字段与状态', () => {
    const result = capsuleEntitySchema.safeParse({
      id: ID,
      date: '2026-07-29',
      start_at: '2026-07-29T14:00:00.000Z',
      end_at: '2026-07-29T15:00:00.000Z',
      tag_ids: [],
      source: 'manual',
      status: 'confirmed',
      is_highlight: false,
      is_private: false,
      created_at: '2026-07-29T15:00:00.000Z',
      updated_at: '2026-07-29T15:00:00.000Z',
      deleted_at: null,
    })
    expect(result.success).toBe(true)
  })
})
