import { describe, expect, it } from 'vitest'
import { backupStatusSchema } from '../src'

describe('本地备份可见性状态', () => {
  it('只接受闭集提醒周期和非负计数', () => {
    const status = {
      reminder_interval_days: 14,
      last_backup: {
        created_at: '2026-08-10T12:00:00.000Z',
        summary: {
          entity_count: 37,
          soft_deleted_count: 8,
          tables: { tags: 14, capsules: 19, day_seals: 1, ai_reports: 3 },
        },
      },
      last_restore: null,
    }
    expect(backupStatusSchema.safeParse(status).success).toBe(true)
    expect(
      backupStatusSchema.safeParse({
        ...status,
        reminder_interval_days: 10,
      }).success,
    ).toBe(false)
    expect(
      backupStatusSchema.safeParse({
        ...status,
        last_backup: {
          ...status.last_backup,
          summary: { ...status.last_backup.summary, entity_count: -1 },
        },
      }).success,
    ).toBe(false)
  })
})
