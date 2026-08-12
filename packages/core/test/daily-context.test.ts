import { describe, expect, it } from 'vitest'
import { buildDailyContext } from '../src'

describe('日复盘 Context Builder（08 §2）', () => {
  it('生成稳定的日汇总、标签占比、空隙和心情曲线', () => {
    const context = buildDailyContext({
      date: '2026-07-27',
      timezone: 'Asia/Shanghai',
      streak: 12,
      capsules: [
        {
          startAt: new Date('2026-07-26T23:00:00Z'),
          endAt: new Date('2026-07-27T00:00:00Z'),
          tags: ['通勤'],
          summary: '地铁阅读',
          mood: 4,
        },
        {
          startAt: new Date('2026-07-27T00:30:00Z'),
          endAt: new Date('2026-07-27T02:00:00Z'),
          tags: ['工作', '学习'],
          detail: '完成同步契约',
          isHighlight: true,
        },
      ],
    })

    expect(context.weekday).toBe('周一')
    expect(context.day_summary).toEqual({
      capsule_count: 2,
      recorded_minutes: 150,
      first_at: '07:00',
      last_at: '10:00',
      by_tag: [
        { tag: '工作', minutes: 90, pct: 60 },
        { tag: '通勤', minutes: 60, pct: 40 },
      ],
      gaps_minutes: 30,
      mood_curve: [{ t: '07:00', mood: 4 }],
    })
    expect(context.capsules[1]).toMatchObject({
      t: '08:30-10:00',
      tags: ['工作', '学习'],
      minutes: 90,
      detail: '完成同步契约',
      highlight: true,
    })
  })

  it('私密胶囊内容在返回对象与序列化结果中被物理剔除', () => {
    const secret = '不应进入模型的私密原文'
    const context = buildDailyContext({
      date: '2026-07-27',
      timezone: 'Asia/Shanghai',
      streak: 1,
      capsules: [
        {
          startAt: new Date('2026-07-27T01:00:00Z'),
          endAt: new Date('2026-07-27T02:00:00Z'),
          tags: ['私人'],
          summary: secret,
          detail: `${secret}-detail`,
          mood: 1,
          isHighlight: true,
          isPrivate: true,
        },
      ],
    })

    expect(context.capsules).toEqual([
      {
        t: '09:00-10:00',
        tags: ['私人'],
        minutes: 60,
        private: true,
      },
    ])
    expect(context.day_summary.mood_curve).toEqual([])
    expect(JSON.stringify(context)).not.toContain(secret)
    expect(JSON.stringify(context)).not.toContain('"mood":1')
    expect(JSON.stringify(context)).not.toContain('"highlight":true')
  })

  it('空日仍返回完整且可序列化的结构', () => {
    const context = buildDailyContext({
      date: '2026-07-28',
      timezone: 'UTC',
      streak: 0,
      capsules: [],
    })

    expect(context.day_summary).toEqual({
      capsule_count: 0,
      recorded_minutes: 0,
      first_at: null,
      last_at: null,
      by_tag: [],
      gaps_minutes: 0,
      mood_curve: [],
    })
    expect(context.capsules).toEqual([])
  })
})
