import { describe, expect, it } from 'vitest'
import { isBackupReminderDue } from '../src'

const now = new Date('2026-08-10T12:00:00.000Z')

describe('本地完整备份提醒', () => {
  it('无业务数据或关闭提醒时不提示', () => {
    expect(
      isBackupReminderDue(
        { hasData: false, lastBackupAt: null, reminderIntervalDays: 7 },
        now,
      ),
    ).toBe(false)
    expect(
      isBackupReminderDue(
        { hasData: true, lastBackupAt: null, reminderIntervalDays: null },
        now,
      ),
    ).toBe(false)
  })

  it('有数据但从未生成完整备份时提示', () => {
    expect(
      isBackupReminderDue(
        { hasData: true, lastBackupAt: null, reminderIntervalDays: 7 },
        now,
      ),
    ).toBe(true)
  })

  it('严格按选择的自然时长到期', () => {
    expect(
      isBackupReminderDue(
        {
          hasData: true,
          lastBackupAt: '2026-08-03T12:00:00.000Z',
          reminderIntervalDays: 7,
        },
        now,
      ),
    ).toBe(true)
    expect(
      isBackupReminderDue(
        {
          hasData: true,
          lastBackupAt: '2026-08-04T12:00:00.001Z',
          reminderIntervalDays: 7,
        },
        now,
      ),
    ).toBe(false)
  })
})
