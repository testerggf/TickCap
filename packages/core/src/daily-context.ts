/**
 * 日复盘 Context Builder（docs/08 §2）。
 *
 * 隐私过滤必须在这里物理执行：私密胶囊只保留时间、标签和时长，
 * summary/detail/mood/highlight 永远不进入返回对象。
 */
import { computeGaps } from './gaps'
import { getLocalParts, MINUTE_MS } from './time'
import type { DateString, TimeSpan } from './types'

export interface DailyContextCapsuleInput extends TimeSpan {
  tags: string[]
  summary?: string
  detail?: string
  mood?: number
  isHighlight?: boolean
  isPrivate?: boolean
}

export interface DailyContextCapsule {
  t: string
  tags: string[]
  minutes: number
  summary?: string
  detail?: string
  mood?: number
  highlight?: boolean
  private?: true
}

export interface DailyContext {
  date: DateString
  weekday: string
  day_summary: {
    capsule_count: number
    recorded_minutes: number
    first_at: string | null
    last_at: string | null
    by_tag: { tag: string; minutes: number; pct: number }[]
    gaps_minutes: number
    mood_curve: { t: string; mood: number }[]
  }
  capsules: DailyContextCapsule[]
  streak: number
  recent_context?: string
}

export interface BuildDailyContextInput {
  date: DateString
  timezone: string
  capsules: DailyContextCapsuleInput[]
  streak: number
  recentContext?: string
}

function formatHM(date: Date, timezone: string): string {
  const parts = getLocalParts(date, timezone)
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

function weekdayOf(date: DateString): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = '日一二三四五六'[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]
  return `周${weekday}`
}

function durationMinutes(capsule: TimeSpan): number {
  return Math.max(
    0,
    Math.round((capsule.endAt.getTime() - capsule.startAt.getTime()) / MINUTE_MS),
  )
}

export function buildDailyContext({
  date,
  timezone,
  capsules,
  streak,
  recentContext,
}: BuildDailyContextInput): DailyContext {
  const sorted = [...capsules].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  )
  const byTagMinutes = new Map<string, number>()
  let recordedMinutes = 0

  for (const capsule of sorted) {
    const minutes = durationMinutes(capsule)
    recordedMinutes += minutes
    const primaryTag = capsule.tags[0] ?? '记录'
    byTagMinutes.set(primaryTag, (byTagMinutes.get(primaryTag) ?? 0) + minutes)
  }

  const byTag = [...byTagMinutes.entries()]
    .map(([tag, minutes]) => ({
      tag,
      minutes,
      pct: recordedMinutes ? Math.round((minutes / recordedMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)

  const gapsMinutes = computeGaps(
    sorted.map(({ startAt, endAt }) => ({ startAt, endAt })),
  ).reduce((total, gap) => total + gap.minutes, 0)

  const contextCapsules: DailyContextCapsule[] = sorted.map((capsule) => {
    const base = {
      t: `${formatHM(capsule.startAt, timezone)}-${formatHM(capsule.endAt, timezone)}`,
      tags: [...capsule.tags],
      minutes: durationMinutes(capsule),
    }
    if (capsule.isPrivate) return { ...base, private: true }
    return {
      ...base,
      summary: capsule.summary,
      detail: capsule.detail,
      mood: capsule.mood,
      highlight: capsule.isHighlight || undefined,
    }
  })

  const context: DailyContext = {
    date,
    weekday: weekdayOf(date),
    day_summary: {
      capsule_count: sorted.length,
      recorded_minutes: recordedMinutes,
      first_at: sorted[0] ? formatHM(sorted[0].startAt, timezone) : null,
      last_at: sorted.at(-1) ? formatHM(sorted.at(-1)!.endAt, timezone) : null,
      by_tag: byTag,
      gaps_minutes: gapsMinutes,
      mood_curve: sorted
        .filter(
          (capsule): capsule is DailyContextCapsuleInput & { mood: number } =>
            !capsule.isPrivate && capsule.mood !== undefined,
        )
        .map((capsule) => ({
          t: formatHM(capsule.startAt, timezone),
          mood: capsule.mood,
        })),
    },
    capsules: contextCapsules,
    streak,
  }
  if (recentContext) context.recent_context = recentContext
  return context
}
