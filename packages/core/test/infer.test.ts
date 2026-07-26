import { describe, expect, it } from 'vitest'
import { inferTimes, type UserTimeSettings } from '../src'

const S: UserTimeSettings = { timezone: 'Asia/Shanghai', dayBoundaryMin: 240, wakeDefaultMin: 420 }

const iso = (d: Date) => d.toISOString()

describe('时间自动推断 inferTimes（07 §2.2）', () => {
  it('续记：start = 上一颗的结束时刻（无缝流水账）', () => {
    const { startAt, endAt } = inferTimes({
      now: new Date('2026-07-28T03:23:00Z'),
      lastCapsuleEndAt: new Date('2026-07-28T02:00:00Z'),
      settings: S,
    })
    expect(iso(startAt)).toBe('2026-07-28T02:00:00.000Z')
    expect(iso(endAt)).toBe('2026-07-28T03:23:00.000Z')
  })

  it('首颗 · 上午 9 点记录：start = now - 1h（比 7 点起床更近）', () => {
    // 北京 09:00 = 01:00Z；起床 07:00 与 08:00 取近者 → 08:00
    const { startAt } = inferTimes({ now: new Date('2026-07-28T01:00:00Z'), settings: S })
    expect(iso(startAt)).toBe('2026-07-28T00:00:00.000Z') // 北京 08:00
  })

  it('首颗 · 07:30 记录：start = 默认起床时间 07:00（比 06:30 更近）', () => {
    const { startAt } = inferTimes({ now: new Date('2026-07-27T23:30:00Z'), settings: S })
    expect(iso(startAt)).toBe('2026-07-27T23:00:00.000Z') // 北京 07:00
  })

  it('首颗 · 起床时间还没到（06:00 记录）：退回 now - 1h', () => {
    const { startAt, endAt } = inferTimes({ now: new Date('2026-07-27T22:00:00Z'), settings: S })
    expect(iso(startAt)).toBe('2026-07-27T21:00:00.000Z') // 北京 05:00
    expect(startAt.getTime()).toBeLessThan(endAt.getTime())
  })

  it('首颗 · 凌晨 02:00（归属昨天）：起床时刻落在昨天，start = now - 1h', () => {
    // 北京 28 日 02:00 = 27 日 18:00Z；归属日 27 日，其起床时刻(27日07:00)远在过去
    const { startAt } = inferTimes({ now: new Date('2026-07-27T18:00:00Z'), settings: S })
    expect(iso(startAt)).toBe('2026-07-27T17:00:00.000Z') // 北京 01:00
  })

  it('上一颗结束时刻 == now：钳制为 1 分钟时长', () => {
    const now = new Date('2026-07-28T02:00:00Z')
    const { startAt, endAt } = inferTimes({ now, lastCapsuleEndAt: now, settings: S })
    expect(endAt.getTime() - startAt.getTime()).toBe(60_000)
  })

  it('上一颗结束时刻在未来（用户手调过）：同样钳制，不产生负时长', () => {
    const { startAt, endAt } = inferTimes({
      now: new Date('2026-07-28T02:00:00Z'),
      lastCapsuleEndAt: new Date('2026-07-28T02:10:00Z'),
      settings: S,
    })
    expect(endAt.getTime() - startAt.getTime()).toBe(60_000)
  })

  it('秒与毫秒被抹平到分钟', () => {
    const { startAt, endAt } = inferTimes({
      now: new Date('2026-07-28T01:00:45.678Z'),
      lastCapsuleEndAt: new Date('2026-07-28T00:30:30.500Z'),
      settings: S,
    })
    expect(endAt.getSeconds()).toBe(0)
    expect(endAt.getMilliseconds()).toBe(0)
    expect(startAt.getSeconds()).toBe(0)
  })
})
