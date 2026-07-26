/** 归属日规则（docs/07 §2.1）：日界之前的时刻归前一天。 */
import { getLocalParts, minutesOfDay, shiftDateString, toDateString } from './time'
import type { DateString, UserTimeSettings } from './types'

/** 胶囊归属日：按 startAt 判定（跨日界胶囊也只看 startAt） */
export function attributeDate(startAt: Date, s: UserTimeSettings): DateString {
  const p = getLocalParts(startAt, s.timezone)
  const date = toDateString(p)
  return minutesOfDay(p) < s.dayBoundaryMin ? shiftDateString(date, -1) : date
}

/** 当前的"逻辑今天" */
export function logicalToday(now: Date, s: UserTimeSettings): DateString {
  return attributeDate(now, s)
}
