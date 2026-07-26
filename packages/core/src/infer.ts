/** 时间自动推断（docs/07 §2.2）：让用户永远不碰时间选择器。 */
import { attributeDate } from './attribution'
import { MINUTE_MS, floorToMinute, zonedTime } from './time'
import type { TimeSpan, UserTimeSettings } from './types'

export interface InferInput {
  now: Date
  /** 同归属日内最后一颗胶囊的结束时刻；无则为当天首颗 */
  lastCapsuleEndAt?: Date | null
  settings: UserTimeSettings
}

/**
 * 新胶囊默认时间段：
 * - 续记：start = 上一颗结束时刻（无缝流水账）
 * - 首颗：start = max(now - 1h, 归属日的默认起床时间)；起床时间在未来则退回 now - 1h
 * - 兜底：start ≥ end 时钳制为 end - 1min（时长下限 1 分钟）
 */
export function inferTimes({ now, lastCapsuleEndAt, settings }: InferInput): TimeSpan {
  const endAt = floorToMinute(now)
  let startAt: Date

  if (lastCapsuleEndAt) {
    startAt = floorToMinute(lastCapsuleEndAt)
  } else {
    const date = attributeDate(now, settings)
    // 归属日的起床时刻：凌晨（日界前）记录时归属日为昨天，起床时刻自然落在昨天
    const wakeAt = zonedTime(date, settings.wakeDefaultMin, settings.timezone)
    const oneHourAgo = new Date(endAt.getTime() - 60 * MINUTE_MS)
    startAt = wakeAt <= endAt ? new Date(Math.max(wakeAt.getTime(), oneHourAgo.getTime())) : oneHourAgo
  }

  if (startAt.getTime() >= endAt.getTime()) {
    startAt = new Date(endAt.getTime() - MINUTE_MS)
  }
  return { startAt, endAt }
}
