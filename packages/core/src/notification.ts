import { logicalToday } from './attribution'
import { MINUTE_MS, shiftDateString, zonedTime } from './time'
import type { UserTimeSettings } from './types'

export interface LocalNotificationPlanInput {
  now: Date
  settings: UserTimeSettings
  reminderIntervalMin: 30 | 60 | 120
  snoozeLevel: 0 | 1 | 2
  sealReminderMin: number
  lastCapsuleEndAt: Date | null
  lastAppOpenAt: Date | null
  todayHasCapsules: boolean
  todaySealed: boolean
}

export interface LocalNotificationPlan {
  intervalAt: Date
  sealAt: Date | null
}

function minuteOffsetFromLogicalDay(
  minute: number,
  dayBoundaryMin: number,
): number {
  return minute < dayBoundaryMin ? minute + 24 * 60 : minute
}

function activeWindow(
  date: string,
  input: Pick<
    LocalNotificationPlanInput,
    'settings' | 'sealReminderMin'
  >,
): { start: Date; end: Date } {
  const wakeOffset = minuteOffsetFromLogicalDay(
    input.settings.wakeDefaultMin,
    input.settings.dayBoundaryMin,
  )
  let sealOffset = minuteOffsetFromLogicalDay(
    input.sealReminderMin,
    input.settings.dayBoundaryMin,
  )
  if (sealOffset <= wakeOffset) sealOffset += 24 * 60
  return {
    start: zonedTime(date, wakeOffset, input.settings.timezone),
    end: zonedTime(date, sealOffset, input.settings.timezone),
  }
}

function nextIntervalAt(input: LocalNotificationPlanInput): Date {
  const baseline = Math.max(
    input.now.getTime(),
    input.lastCapsuleEndAt?.getTime() ?? 0,
    input.lastAppOpenAt?.getTime() ?? 0,
  )
  const candidate = new Date(
    baseline +
      input.reminderIntervalMin * 2 ** input.snoozeLevel * MINUTE_MS,
  )
  const candidateDate = logicalToday(candidate, input.settings)
  for (const dayDelta of [-1, 0, 1, 2]) {
    const window = activeWindow(
      shiftDateString(candidateDate, dayDelta),
      input,
    )
    if (candidate.getTime() >= window.end.getTime()) continue
    return candidate.getTime() <= window.start.getTime()
      ? window.start
      : candidate
  }
  throw new Error('无法计算下一次本地提醒时间')
}

function nextSealAt(input: LocalNotificationPlanInput): Date | null {
  if (!input.todayHasCapsules || input.todaySealed) return null
  const today = logicalToday(input.now, input.settings)
  const sealOffset = minuteOffsetFromLogicalDay(
    input.sealReminderMin,
    input.settings.dayBoundaryMin,
  )
  const todayAt = zonedTime(today, sealOffset, input.settings.timezone)
  return todayAt.getTime() > input.now.getTime() ? todayAt : null
}

export function planLocalNotifications(
  input: LocalNotificationPlanInput,
): LocalNotificationPlan {
  return {
    intervalAt: nextIntervalAt(input),
    sealAt: nextSealAt(input),
  }
}

export function buildNotificationOperationKey(
  notificationId: string,
  actionId: string,
  tagId: string,
): string {
  return [notificationId, actionId, tagId]
    .map((part) => encodeURIComponent(part))
    .join(':')
}
