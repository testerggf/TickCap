export interface TimestampedBackupEntity {
  id: string
  updated_at: string
}

export interface BackupMergeDecision<T> {
  entity: T
  action: 'insert' | 'replace' | 'skip'
}

/**
 * 备份恢复的唯一合并规则：稳定 UUID 不存在则插入；备份版本严格更新才替换；
 * 相同或更旧版本跳过，保证重复导入幂等且不倒退本机修改。
 */
export function planTimestampedBackupMerge<T extends TimestampedBackupEntity>(
  localEntities: readonly TimestampedBackupEntity[],
  backupEntities: readonly T[],
): BackupMergeDecision<T>[] {
  const localById = new Map(localEntities.map((entity) => [entity.id, entity]))
  return backupEntities.map((entity) => {
    const local = localById.get(entity.id)
    if (!local) return { entity, action: 'insert' }
    return {
      entity,
      action:
        new Date(entity.updated_at).getTime() >
        new Date(local.updated_at).getTime()
          ? 'replace'
          : 'skip',
    }
  })
}

export function findStableKeyConflicts<
  T extends { id: string },
  K extends string,
>(
  localEntities: readonly T[],
  backupEntities: readonly T[],
  keyOf: (entity: T) => K,
): K[] {
  const localIdByKey = new Map(
    localEntities.map((entity) => [keyOf(entity), entity.id]),
  )
  return backupEntities
    .filter((entity) => {
      const localId = localIdByKey.get(keyOf(entity))
      return localId !== undefined && localId !== entity.id
    })
    .map(keyOf)
}
