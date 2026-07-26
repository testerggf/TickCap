import { describe, expect, it } from 'vitest'
import {
  canSealKeepingStreak,
  computeStreak,
  sealGraceDeadline,
  type PrevSeal,
  type UserTimeSettings,
} from '../src'

const S: UserTimeSettings = { timezone: 'Asia/Shanghai', dayBoundaryMin: 240, wakeDefaultMin: 420 }

describe('封存与 Streak（07 §2.4）', () => {
  it('宽限截止 = 次日中午 12:00（用户时区）', () => {
    // 2026-07-26 的截止 = 北京 07-27 12:00 = 04:00Z
    expect(sealGraceDeadline('2026-07-26', S).toISOString()).toBe('2026-07-27T04:00:00.000Z')
  })

  it('前一天当晚正常封存 → streak +1', () => {
    const prev: PrevSeal = {
      date: '2026-07-26',
      firstSealedAt: new Date('2026-07-26T14:00:00Z'), // 北京 26 日 22:00
      streak: 5,
    }
    expect(computeStreak(prev, '2026-07-27', S)).toBe(6)
  })

  it('前一天在次日 11:00 补封（宽限内）→ 仍连续', () => {
    const prev: PrevSeal = {
      date: '2026-07-26',
      firstSealedAt: new Date('2026-07-27T03:00:00Z'), // 北京 27 日 11:00
      streak: 5,
    }
    expect(computeStreak(prev, '2026-07-27', S)).toBe(6)
  })

  it('前一天在次日 13:00 才补封（超宽限）→ 重新从 1 开始', () => {
    const prev: PrevSeal = {
      date: '2026-07-26',
      firstSealedAt: new Date('2026-07-27T05:00:00Z'), // 北京 27 日 13:00
      streak: 5,
    }
    expect(computeStreak(prev, '2026-07-27', S)).toBe(1)
  })

  it('无历史封存 → 1', () => {
    expect(computeStreak(null, '2026-07-27', S)).toBe(1)
  })

  it('前一次封存不是昨天（断档）→ 1', () => {
    const prev: PrevSeal = {
      date: '2026-07-24',
      firstSealedAt: new Date('2026-07-24T14:00:00Z'),
      streak: 9,
    }
    expect(computeStreak(prev, '2026-07-27', S)).toBe(1)
  })

  it('跨月连续（07-31 → 08-01）', () => {
    const prev: PrevSeal = {
      date: '2026-07-31',
      firstSealedAt: new Date('2026-07-31T14:00:00Z'),
      streak: 3,
    }
    expect(computeStreak(prev, '2026-08-01', S)).toBe(4)
  })

  it('canSealKeepingStreak：截止前 true，截止后 false', () => {
    // 2026-07-26 的截止 = 04:00Z (27日北京12:00)
    expect(canSealKeepingStreak('2026-07-26', new Date('2026-07-27T03:59:00Z'), S)).toBe(true)
    expect(canSealKeepingStreak('2026-07-26', new Date('2026-07-27T04:00:00Z'), S)).toBe(true) // 含边界
    expect(canSealKeepingStreak('2026-07-26', new Date('2026-07-27T04:01:00Z'), S)).toBe(false)
  })
})
