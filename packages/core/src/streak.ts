/** 封存与 Streak 规则（docs/07 §2.4）：宽限到次日中午，断一天不毁一个习惯。 */
import { shiftDateString, zonedTime } from './time'
import type { DateString, UserTimeSettings } from './types'

/** 宽限截止：D 日的封存在 D+1 的 12:00（用户时区）前完成才算连续 */
export const GRACE_DEADLINE_MIN = 12 * 60

export interface PrevSeal {
  date: DateString
  /** 首次封存时刻（解封重封不更新，07 §2.4） */
  firstSealedAt: Date
  streak: number
}

export function sealGraceDeadline(date: DateString, s: UserTimeSettings): Date {
  return zonedTime(shiftDateString(date, 1), GRACE_DEADLINE_MIN, s.timezone)
}

export function isSealedWithinGrace(date: DateString, firstSealedAt: Date, s: UserTimeSettings): boolean {
  return firstSealedAt.getTime() <= sealGraceDeadline(date, s).getTime()
}

/** 此刻封存 date 是否还能保持连续（用于 UI 提示） */
export function canSealKeepingStreak(date: DateString, now: Date, s: UserTimeSettings): boolean {
  return now.getTime() <= sealGraceDeadline(date, s).getTime()
}

/**
 * 封存 sealDate 时的 streak 值（封存时计算并快照，不做历史回算）：
 * 前一日存在封存且其首封在宽限内 → prev.streak + 1，否则重新从 1 开始。
 */
export function computeStreak(prev: PrevSeal | null, sealDate: DateString, s: UserTimeSettings): number {
  if (!prev || prev.date !== shiftDateString(sealDate, -1)) return 1
  return isSealedWithinGrace(prev.date, prev.firstSealedAt, s) ? prev.streak + 1 : 1
}
