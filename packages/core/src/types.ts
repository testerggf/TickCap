/** 领域类型。术语对照 docs/07 §1。 */

export interface UserTimeSettings {
  /** IANA 时区，如 Asia/Shanghai */
  timezone: string
  /** 日界：归属日分界时刻（当地时间分钟数），默认 04:00 */
  dayBoundaryMin: number
  /** 默认起床时间：首颗胶囊默认起点（当地时间分钟数），默认 07:00 */
  wakeDefaultMin: number
}

export const DEFAULT_TIME_SETTINGS: UserTimeSettings = {
  timezone: 'Asia/Shanghai',
  dayBoundaryMin: 4 * 60,
  wakeDefaultMin: 7 * 60,
}

export interface TimeSpan {
  startAt: Date
  endAt: Date
}

export interface Gap extends TimeSpan {
  minutes: number
}

/** 归属日字符串，YYYY-MM-DD（用户时区 + 日界规则下的"逻辑日"） */
export type DateString = string
