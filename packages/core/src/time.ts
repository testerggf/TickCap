/** 时区与时间工具。全项目唯一允许做时区换算的地方（AGENTS.md 约束）。 */

export const MINUTE_MS = 60_000

export interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatterCache.set(timeZone, fmt)
  }
  return fmt
}

/** 某时刻在指定时区的墙上时间各分量 */
export function getLocalParts(d: Date, timeZone: string): LocalParts {
  const parts: Record<string, string> = {}
  for (const p of getFormatter(timeZone).formatToParts(d)) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  return {
    year: Number(parts['year']),
    month: Number(parts['month']),
    day: Number(parts['day']),
    // h23 下部分环境会给出 "24"，规范化为 0
    hour: Number(parts['hour']) % 24,
    minute: Number(parts['minute']),
  }
}

export function minutesOfDay(p: LocalParts): number {
  return p.hour * 60 + p.minute
}

export function toDateString(p: LocalParts): string {
  const mm = String(p.month).padStart(2, '0')
  const dd = String(p.day).padStart(2, '0')
  return `${p.year}-${mm}-${dd}`
}

/** YYYY-MM-DD 平移 days 天（纯日历运算，与时区无关） */
export function shiftDateString(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d! + days))
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${mm}-${dd}`
}

export function floorToMinute(d: Date): Date {
  return new Date(Math.floor(d.getTime() / MINUTE_MS) * MINUTE_MS)
}

/** 时区在某时刻的 UTC 偏移（分钟，东八区为 +480） */
export function tzOffsetMinutes(d: Date, timeZone: string): number {
  const p = getLocalParts(d, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return Math.round((asUtc - floorToMinute(d).getTime()) / MINUTE_MS)
}

/**
 * 构造"某日历日在指定时区的某墙上时刻"对应的绝对时间。
 * minutes 可超出 [0,1440)（如 720+1440 表示次日中午）。
 * 先用偏移猜测再校正一次，覆盖 DST 切换日。
 */
export function zonedTime(date: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const guessUtc = Date.UTC(y!, m! - 1, d!, 0, minutes)
  let result = new Date(guessUtc - tzOffsetMinutes(new Date(guessUtc), timeZone) * MINUTE_MS)
  // 二次校正：若猜测点与结果点偏移不同（跨 DST），用结果点的偏移重算
  const correction = new Date(guessUtc - tzOffsetMinutes(result, timeZone) * MINUTE_MS)
  if (correction.getTime() !== result.getTime()) result = correction
  return result
}
