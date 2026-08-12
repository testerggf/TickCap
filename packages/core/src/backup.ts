function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('备份内容不能包含非有限数值')
    return value
  }
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>
    return Object.keys(input)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        if (input[key] !== undefined) result[key] = canonicalValue(input[key])
        return result
      }, {})
  }
  throw new Error('备份内容包含不可序列化的值')
}

/** 仅用于备份完整性校验；对象键排序，数组顺序保持不变。 */
export function buildCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value))
}

export function buildTickCapBackupJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
