import { getLocalParts, minutesOfDay } from '@tickcap/core'

/** HH:mm（用户时区墙上时间） */
export function fmtHM(iso: string, timezone: string): string {
  const p = getLocalParts(new Date(iso), timezone)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${m}m`
}

export function spanMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
}

/** 2026-07-27 → 7月27日 周一 */
export function fmtDateCn(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const wd = '日一二三四五六'[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]
  return `${m}月${d}日 周${wd}`
}

export function fmtDateFullCn(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

/** 当地墙上分钟数（当日内），用于时间输入框 */
export function localMinutes(iso: string, timezone: string): number {
  return minutesOfDay(getLocalParts(new Date(iso), timezone))
}

export function minToHM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
