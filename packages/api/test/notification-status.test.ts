import { describe, expect, it } from 'vitest'
import { localNotificationStatusSchema } from '../src/mobile'

describe('本地通知运行状态契约', () => {
  it('接受闭集权限状态和两类一次性调度记录', () => {
    expect(
      localNotificationStatusSchema.parse({
        enabled: true,
        permission_status: 'authorized',
        permission_requested_at: '2026-08-10T00:00:00.000Z',
        first_seal_offer_shown: true,
        consecutive_missed: 0,
        snooze_level: 0,
        last_app_open_at: '2026-08-10T01:00:00.000Z',
        last_reconciled_at: '2026-08-10T01:00:00.000Z',
        scheduled: {
          interval: {
            identifier: 'native-interval',
            notification_id: 'local-interval-1',
            fire_at: '2026-08-10T02:00:00.000Z',
          },
          seal: null,
        },
      }).permission_status,
    ).toBe('authorized')
  })
})
