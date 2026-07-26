import { describe, expect, it } from 'vitest'
import { attributeDate, logicalToday, type UserTimeSettings } from '../src'

// 东八区，日界 04:00，起床 07:00（产品默认）
const S: UserTimeSettings = { timezone: 'Asia/Shanghai', dayBoundaryMin: 240, wakeDefaultMin: 420 }

describe('归属日 attributeDate（07 §2.1）', () => {
  it('凌晨 01:30（日界前）归前一天 —— 夜宵属于"昨晚"', () => {
    // UTC 17:30 = 北京时间次日 01:30
    expect(attributeDate(new Date('2026-07-27T17:30:00Z'), S)).toBe('2026-07-27')
  })

  it('05:00（日界后）归当天', () => {
    expect(attributeDate(new Date('2026-07-27T21:00:00Z'), S)).toBe('2026-07-28')
  })

  it('恰好 04:00 归当天（边界含右不含左）', () => {
    expect(attributeDate(new Date('2026-07-27T20:00:00Z'), S)).toBe('2026-07-28')
  })

  it('03:59 归前一天', () => {
    expect(attributeDate(new Date('2026-07-27T19:59:00Z'), S)).toBe('2026-07-27')
  })

  it('日界为 0 时凌晨归当天（自然日模式）', () => {
    const s0 = { ...S, dayBoundaryMin: 0 }
    expect(attributeDate(new Date('2026-07-27T17:30:00Z'), s0)).toBe('2026-07-28')
  })

  it('跨月/跨年边界正确平移', () => {
    // 北京时间 2026-01-01 01:00 → 归 2025-12-31
    expect(attributeDate(new Date('2025-12-31T17:00:00Z'), S)).toBe('2025-12-31')
  })

  it('UTC 时区用户', () => {
    const utc = { ...S, timezone: 'UTC' }
    expect(attributeDate(new Date('2026-07-28T01:30:00Z'), utc)).toBe('2026-07-27')
    expect(attributeDate(new Date('2026-07-28T05:00:00Z'), utc)).toBe('2026-07-28')
  })

  it('跨零点胶囊只看 startAt（睡眠 23:00 开始 → 归当天）', () => {
    // 23:00 北京时间 = 15:00Z，胶囊结束于次日早 7 点也不影响归属
    expect(attributeDate(new Date('2026-07-27T15:00:00Z'), S)).toBe('2026-07-27')
  })

  it('logicalToday 与 attributeDate 一致', () => {
    const now = new Date('2026-07-27T18:00:00Z') // 北京 28 日 02:00
    expect(logicalToday(now, S)).toBe('2026-07-27')
  })
})
