import { describe, expect, it } from 'vitest'
import {
  findStableKeyConflicts,
  planTimestampedBackupMerge,
} from '../src'

describe('本地备份恢复合并', () => {
  it('按稳定 UUID 插入、只用严格更新版本替换，其余跳过', () => {
    const local = [
      { id: 'same', updated_at: '2026-08-10T10:00:00.000Z' },
      { id: 'newer-local', updated_at: '2026-08-10T12:00:00.000Z' },
    ]
    const decisions = planTimestampedBackupMerge(local, [
      { id: 'new', updated_at: '2026-08-10T09:00:00.000Z' },
      { id: 'same', updated_at: '2026-08-10T11:00:00.000Z' },
      { id: 'newer-local', updated_at: '2026-08-10T11:00:00.000Z' },
    ])

    expect(decisions.map(({ action }) => action)).toEqual([
      'insert',
      'replace',
      'skip',
    ])
  })

  it('重复导入相同版本全部跳过', () => {
    const entities = [
      { id: 'one', updated_at: '2026-08-10T10:00:00.000Z' },
      { id: 'two', updated_at: '2026-08-10T11:00:00.000Z' },
    ]
    expect(
      planTimestampedBackupMerge(entities, entities).every(
        ({ action }) => action === 'skip',
      ),
    ).toBe(true)
  })

  it('发现相同归属日却使用不同稳定 UUID 的封存冲突', () => {
    expect(
      findStableKeyConflicts(
        [{ id: 'local', date: '2026-08-10' }],
        [{ id: 'backup', date: '2026-08-10' }],
        (seal) => seal.date,
      ),
    ).toEqual(['2026-08-10'])
  })
})
