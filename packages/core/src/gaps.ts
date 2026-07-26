/** 空隙计算（docs/07 §2.3）：纯派生数据，不落库。 */
import { MINUTE_MS } from './time'
import type { Gap, TimeSpan } from './types'

export interface GapOptions {
  /** 提供后计算"最后一颗胶囊 → 现在"的尾部空隙 */
  now?: Date
  /** 空隙下限（分钟），默认 15 */
  minGapMinutes?: number
}

/** 输入无需有序；允许重叠（07 §2.2），重叠区间不会产生负空隙 */
export function computeGaps(spans: TimeSpan[], opts: GapOptions = {}): Gap[] {
  const minGapMs = (opts.minGapMinutes ?? 15) * MINUTE_MS
  const sorted = [...spans].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())

  const gaps: Gap[] = []
  let cursor: Date | null = null // 已覆盖区间的最右端

  const pushIfGap = (from: Date, to: Date) => {
    const ms = to.getTime() - from.getTime()
    if (ms >= minGapMs) {
      gaps.push({ startAt: from, endAt: to, minutes: Math.round(ms / MINUTE_MS) })
    }
  }

  for (const s of sorted) {
    if (cursor && s.startAt.getTime() > cursor.getTime()) {
      pushIfGap(cursor, s.startAt)
    }
    if (!cursor || s.endAt.getTime() > cursor.getTime()) cursor = s.endAt
  }

  if (opts.now && cursor && opts.now.getTime() > cursor.getTime()) {
    pushIfGap(cursor, opts.now)
  }
  return gaps
}
