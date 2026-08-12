import { describe, expect, it } from 'vitest'
import { buildCanonicalJson, buildTickCapBackupJson } from '../src'

describe('本地备份序列化', () => {
  it('对象键顺序不影响完整性校验输入，数组顺序保持不变', () => {
    expect(buildCanonicalJson({ b: 2, a: { d: 4, c: [2, 1] } })).toBe(
      '{"a":{"c":[2,1],"d":4},"b":2}',
    )
    expect(buildCanonicalJson({ a: { c: [2, 1], d: 4 }, b: 2 })).toBe(
      buildCanonicalJson({ b: 2, a: { d: 4, c: [2, 1] } }),
    )
  })

  it('输出便于用户保存和检查的格式化 JSON', () => {
    expect(buildTickCapBackupJson({ kind: 'tickcap-local-backup' })).toBe(
      '{\n  "kind": "tickcap-local-backup"\n}',
    )
  })
})
