import { describe, expect, it } from 'vitest'
import { buildDailyContext, buildLocalDailyReview } from '../src'

describe('本地降级复盘（08 §5）', () => {
  it('输出纵览、时间账单、高光和明日一问', () => {
    const context = buildDailyContext({
      date: '2026-07-29',
      timezone: 'Asia/Shanghai',
      streak: 3,
      capsules: [
        {
          startAt: new Date('2026-07-28T23:00:00Z'),
          endAt: new Date('2026-07-29T00:00:00Z'),
          tags: ['工作'],
          summary: '梳理方案',
          detail: '完成了 iOS 封存设计',
          isHighlight: true,
        },
        {
          startAt: new Date('2026-07-29T00:00:00Z'),
          endAt: new Date('2026-07-29T00:30:00Z'),
          tags: ['学习'],
        },
      ],
    })

    const review = buildLocalDailyReview(context)
    expect(review).toContain('## 一日纵览')
    expect(review).toContain('今天记录了 2 颗胶囊，共 1.5 小时')
    expect(review).toContain('- 工作：1h（67%）')
    expect(review).toContain('完成了 iOS 封存设计')
    expect(review).toContain('## 明日一问')
  })

  it('私密胶囊正文不会被降级复盘重新暴露', () => {
    const secret = '不可出域的私密内容'
    const context = buildDailyContext({
      date: '2026-07-29',
      timezone: 'Asia/Shanghai',
      streak: 1,
      capsules: [
        {
          startAt: new Date('2026-07-29T00:00:00Z'),
          endAt: new Date('2026-07-29T01:00:00Z'),
          tags: ['私人'],
          summary: secret,
          detail: secret,
          isHighlight: true,
          isPrivate: true,
        },
      ],
    })

    expect(buildLocalDailyReview(context)).not.toContain(secret)
  })
})
