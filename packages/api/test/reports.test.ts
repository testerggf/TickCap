import { describe, expect, it } from 'vitest'
import { aiReportEntitySchema, daySealEntitySchema } from '../src'

const timestamp = '2026-07-29T16:40:00.000Z'

describe('封存与报告契约', () => {
  it('解析 day seal 实体', () => {
    expect(
      daySealEntitySchema.parse({
        id: '4b6256a0-0b5a-4e22-8a4b-cf3b82059f5d',
        date: '2026-07-29',
        sealed_at: timestamp,
        first_sealed_at: timestamp,
        note: null,
        streak: 1,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      }).streak,
    ).toBe(1)
  })

  it('拒绝非正数 streak', () => {
    expect(
      daySealEntitySchema.safeParse({
        id: '4b6256a0-0b5a-4e22-8a4b-cf3b82059f5d',
        date: '2026-07-29',
        sealed_at: timestamp,
        first_sealed_at: timestamp,
        note: null,
        streak: 0,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      }).success,
    ).toBe(false)
  })

  it('解析本地完成态日报', () => {
    const report = aiReportEntitySchema.parse({
      id: 'cbf64bdd-7eab-405a-83f8-f2d4ac32664f',
      type: 'daily',
      period_start: '2026-07-29',
      period_end: '2026-07-29',
      template_id: null,
      persona: null,
      content_md: '## 一日纵览',
      edited_md: null,
      model: 'local',
      prompt_version: 'local-v1',
      input_tokens: null,
      output_tokens: null,
      status: 'done',
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    })
    expect(report.model).toBe('local')
  })
})
