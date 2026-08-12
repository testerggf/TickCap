import { describe, expect, it } from 'vitest'
import {
  mobileFocusSchema,
  notificationDataSchema,
  tickcapDeepLinkSchema,
} from '../src'

describe('移动端外部输入契约', () => {
  it('只接受 tickcap scheme', () => {
    expect(
      tickcapDeepLinkSchema.safeParse('tickcap://today?focus=tickbar').success,
    ).toBe(true)
    expect(
      tickcapDeepLinkSchema.safeParse('https://evil.test/?focus=tickbar').success,
    ).toBe(false)
  })

  it('focus 使用闭集', () => {
    expect(mobileFocusSchema.safeParse('tickbar').success).toBe(true)
    expect(mobileFocusSchema.safeParse('unknown').success).toBe(false)
  })

  it('通知数据必须包含合法 target', () => {
    expect(
      notificationDataSchema.safeParse({
        target: 'tickcap://today?focus=tickbar',
        notification_id: 'g1-probe',
      }).success,
    ).toBe(true)
    expect(notificationDataSchema.safeParse({ target: 'javascript:alert(1)' }).success).toBe(
      false,
    )
  })
})
