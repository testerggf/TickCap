import { describe, expect, it } from 'vitest'
import { computeGaps, type TimeSpan } from '../src'

// 便捷构造：当天某 UTC 时刻的区间
const span = (start: string, end: string): TimeSpan => ({
  startAt: new Date(`2026-07-28T${start}:00Z`),
  endAt: new Date(`2026-07-28T${end}:00Z`),
})

describe('空隙计算 computeGaps（07 §2.3）', () => {
  it('相邻无缝胶囊不产生空隙', () => {
    expect(computeGaps([span('07:00', '08:00'), span('08:00', '10:00')])).toEqual([])
  })

  it('≥15 分钟才算空隙', () => {
    const gaps = computeGaps([span('07:00', '08:00'), span('08:20', '09:00')])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.minutes).toBe(20)
    expect(gaps[0]!.startAt.toISOString()).toBe('2026-07-28T08:00:00.000Z')
  })

  it('14 分钟不算空隙', () => {
    expect(computeGaps([span('07:00', '08:00'), span('08:14', '09:00')])).toEqual([])
  })

  it('输入乱序也正确', () => {
    const gaps = computeGaps([span('10:20', '11:00'), span('07:00', '08:00'), span('08:00', '10:00')])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.minutes).toBe(20)
  })

  it('重叠胶囊（07 §2.2 允许重叠）不产生负空隙，被包含区间不打断覆盖', () => {
    // 09:00-11:00 包含 09:30-10:00；下一颗 11:30 → 唯一空隙 11:00-11:30
    const gaps = computeGaps([span('09:00', '11:00'), span('09:30', '10:00'), span('11:30', '12:00')])
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.startAt.toISOString()).toBe('2026-07-28T11:00:00.000Z')
    expect(gaps[0]!.minutes).toBe(30)
  })

  it('传入 now 时计算尾部空隙（最后一颗 → 现在）', () => {
    const gaps = computeGaps([span('07:00', '08:00')], { now: new Date('2026-07-28T08:40:00Z') })
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.minutes).toBe(40)
  })

  it('尾部不足 15 分钟不提示', () => {
    expect(computeGaps([span('07:00', '08:00')], { now: new Date('2026-07-28T08:10:00Z') })).toEqual([])
  })

  it('空输入返回空数组（首颗前不提示空隙）', () => {
    expect(computeGaps([], { now: new Date('2026-07-28T08:00:00Z') })).toEqual([])
  })

  it('自定义空隙阈值', () => {
    const gaps = computeGaps([span('07:00', '08:00'), span('08:10', '09:00')], { minGapMinutes: 5 })
    expect(gaps).toHaveLength(1)
    expect(gaps[0]!.minutes).toBe(10)
  })
})
