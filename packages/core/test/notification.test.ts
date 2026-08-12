import { describe, expect, it } from 'vitest'
import {
  buildNotificationOperationKey,
  planLocalNotifications,
} from '../src/notification'

const settings = {
  timezone: 'Asia/Shanghai',
  dayBoundaryMin: 4 * 60,
  wakeDefaultMin: 9 * 60,
}

describe('个人本地通知计划', () => {
  it('从最近记录、最近打开和当前时刻中的最晚值等待完整间隔', () => {
    const plan = planLocalNotifications({
      now: new Date('2026-08-10T02:00:00.000Z'),
      settings,
      reminderIntervalMin: 60,
      snoozeLevel: 0,
      sealReminderMin: 21 * 60 + 30,
      lastCapsuleEndAt: new Date('2026-08-10T02:20:00.000Z'),
      lastAppOpenAt: new Date('2026-08-10T02:10:00.000Z'),
      todayHasCapsules: true,
      todaySealed: false,
    })
    expect(plan.intervalAt.toISOString()).toBe('2026-08-10T03:20:00.000Z')
    expect(plan.sealAt?.toISOString()).toBe('2026-08-10T13:30:00.000Z')
  })

  it('活跃窗口外顺延到下一次默认起床，已封存则跳过当天晚间提醒', () => {
    const plan = planLocalNotifications({
      now: new Date('2026-08-10T13:10:00.000Z'),
      settings,
      reminderIntervalMin: 60,
      snoozeLevel: 0,
      sealReminderMin: 21 * 60 + 30,
      lastCapsuleEndAt: null,
      lastAppOpenAt: null,
      todayHasCapsules: true,
      todaySealed: true,
    })
    expect(plan.intervalAt.toISOString()).toBe('2026-08-11T01:00:00.000Z')
    expect(plan.sealAt).toBeNull()
  })

  it('日界后的凌晨封存时间仍归属于前一个归属日', () => {
    const plan = planLocalNotifications({
      now: new Date('2026-08-10T16:30:00.000Z'),
      settings,
      reminderIntervalMin: 30,
      snoozeLevel: 0,
      sealReminderMin: 2 * 60,
      lastCapsuleEndAt: null,
      lastAppOpenAt: null,
      todayHasCapsules: true,
      todaySealed: false,
    })
    expect(plan.sealAt?.toISOString()).toBe('2026-08-10T18:00:00.000Z')
  })

  it('action operation key 对相同输入稳定且分隔符安全', () => {
    expect(buildNotificationOperationKey('n:1', 'quick/tick', 'tag 1')).toBe(
      'n%3A1:quick%2Ftick:tag%201',
    )
  })

  it('连续未回应后的 snooze 等级按倍数放慢间隔', () => {
    const plan = planLocalNotifications({
      now: new Date('2026-08-10T02:00:00.000Z'),
      settings,
      reminderIntervalMin: 30,
      snoozeLevel: 2,
      sealReminderMin: 21 * 60 + 30,
      lastCapsuleEndAt: null,
      lastAppOpenAt: null,
      todayHasCapsules: false,
      todaySealed: false,
    })
    expect(plan.intervalAt.toISOString()).toBe('2026-08-10T04:00:00.000Z')
  })
})
