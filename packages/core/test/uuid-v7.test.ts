import { describe, expect, it } from 'vitest'
import { uuidV7 } from '../src'

describe('UUID v7', () => {
  it('编码 48 位毫秒时间戳、v7 版本位和 RFC variant', () => {
    const timestamp = 1_722_240_000_000
    const id = uuidV7(
      timestamp,
      Uint8Array.from([0xab, 0xcd, 0xef, 1, 2, 3, 4, 5, 6, 7]),
    )

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16)).toBe(
      timestamp,
    )
  })

  it('相同随机输入下按时间戳保持字典序', () => {
    const random = new Uint8Array(10)
    expect(uuidV7(2, random) > uuidV7(1, random)).toBe(true)
  })

  it('拒绝非 10 字节随机输入与越界时间戳', () => {
    expect(() => uuidV7(Date.now(), new Uint8Array(9))).toThrow(RangeError)
    expect(() => uuidV7(-1, new Uint8Array(10))).toThrow(RangeError)
  })
})
