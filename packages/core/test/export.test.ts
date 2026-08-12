import { describe, expect, it } from 'vitest'
import { buildTickCapJson, buildTickCapMarkdown } from '../src'

describe('数据导出', () => {
  it('Markdown 按天输出本地时间、封存与复盘', () => {
    const markdown = buildTickCapMarkdown({
      timezone: 'Asia/Shanghai',
      capsules: [
        {
          id: 'capsule-1',
          date: '2026-07-30',
          startAt: '2026-07-30T00:00:00.000Z',
          endAt: '2026-07-30T01:00:00.000Z',
          tagNames: ['工作'],
          summary: '完成方案',
          detail: null,
          mood: 4,
          isHighlight: true,
          isPrivate: false,
        },
      ],
      seals: [
        {
          date: '2026-07-30',
          note: '节奏很好',
          streak: 2,
          sealedAt: '2026-07-30T13:00:00.000Z',
        },
      ],
      reports: [
        {
          periodStart: '2026-07-30',
          type: 'daily',
          contentMd: '## 一日纵览\n完成了重要工作。',
          editedMd: null,
        },
      ],
    })

    expect(markdown).toContain('08:00–09:00 工作 完成方案')
    expect(markdown).toContain('### 封存 · 连续 2 天')
    expect(markdown).toContain('### 复盘')
  })

  it('JSON 阅读导出保留结构与格式版本', () => {
    const json = buildTickCapJson({
      formatVersion: 1,
      exportedAt: '2026-07-30T12:00:00.000Z',
      timezone: 'Asia/Shanghai',
      settings: { day_boundary_min: 240 },
      capsules: [{ id: 'capsule-1', summary: '记录' }],
      seals: [],
      reports: [],
      tags: [],
    })

    expect(JSON.parse(json)).toMatchObject({
      formatVersion: 1,
      capsules: [{ id: 'capsule-1', summary: '记录' }],
    })
  })
})
