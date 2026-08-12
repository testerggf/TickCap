/**
 * UUID v7 编码（RFC 9562）。
 *
 * core 不读取浏览器/Node 随机源；调用方必须注入 10 个随机字节，
 * 由各平台使用自己的安全随机数实现。
 */
export function uuidV7(timestampMs: number, randomBytes: Uint8Array): string {
  if (!Number.isInteger(timestampMs) || timestampMs < 0 || timestampMs > 0xffffffffffff) {
    throw new RangeError('UUID v7 timestamp 必须是 0–2^48-1 的整数毫秒')
  }
  if (randomBytes.length !== 10) {
    throw new RangeError('UUID v7 需要恰好 10 个随机字节')
  }

  const bytes = new Uint8Array(16)
  let timestamp = timestampMs
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp % 256
    timestamp = Math.floor(timestamp / 256)
  }

  bytes[6] = 0x70 | (randomBytes[0]! & 0x0f)
  bytes[7] = randomBytes[1]!
  bytes[8] = 0x80 | (randomBytes[2]! & 0x3f)
  bytes.set(randomBytes.slice(3), 9)

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}
