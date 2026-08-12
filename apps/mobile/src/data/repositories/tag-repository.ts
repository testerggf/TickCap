import type { SQLiteDatabase } from 'expo-sqlite'
import { presetTags } from '@tickcap/tokens'
import { createUuidV7 } from '../ids'
import {
  buildOutboxRecord,
  enqueueOutbox,
} from './outbox-repository'

export interface LocalTag {
  id: string
  name: string
  emoji: string
  color: string
  sort: number
  created_at: string
  updated_at: string
}

export interface CreateTagInput {
  name: string
  emoji: string
  color: string
}

const PRESET_IDS = new Set(presetTags.map((tag) => tag.entityId))

export async function listTags(db: SQLiteDatabase): Promise<LocalTag[]> {
  return db.getAllAsync<LocalTag>(
    `SELECT id, name, emoji, color, sort, created_at, updated_at
     FROM tags WHERE archived_at IS NULL AND deleted_at IS NULL
     ORDER BY sort, created_at, id`,
  )
}

/** 最近使用频率优先，未使用标签按产品既定顺序补足。 */
export async function listQuickTags(
  db: SQLiteDatabase,
  limit = 3,
): Promise<LocalTag[]> {
  return db.getAllAsync<LocalTag>(
    `SELECT
       t.id, t.name, t.emoji, t.color, t.sort, t.created_at, t.updated_at
     FROM tags t
     LEFT JOIN capsules c
       ON c.deleted_at IS NULL
      AND c.created_at >= datetime('now', '-30 days')
      AND EXISTS (
        SELECT 1
        FROM json_each(c.tag_ids_json) tag_id
        WHERE tag_id.value = t.id
      )
     WHERE t.archived_at IS NULL AND t.deleted_at IS NULL
     GROUP BY t.id
     ORDER BY
       COUNT(c.id) DESC,
       CASE t.name
         WHEN '工作' THEN 0
         WHEN '学习' THEN 1
         WHEN '休息' THEN 2
         ELSE 3
       END,
       t.sort, t.created_at, t.id
     LIMIT ?`,
    limit,
  )
}

export async function listCustomTags(db: SQLiteDatabase): Promise<LocalTag[]> {
  return (await listTags(db)).filter((tag) => !PRESET_IDS.has(tag.id))
}

export async function createCustomTag(
  db: SQLiteDatabase,
  input: CreateTagInput,
  now = new Date(),
): Promise<LocalTag> {
  const name = input.name.trim()
  const emoji = input.emoji.trim() || '✨'
  if (!name) throw new Error('请填写标签名')
  const current = await listCustomTags(db)
  if (current.length >= 5) throw new Error('最多添加 5 个自定义标签')
  const timestamp = now.toISOString()
  const tag: LocalTag = {
    id: await createUuidV7(now.getTime()),
    name: name.slice(0, 12),
    emoji: emoji.slice(0, 4),
    color: input.color,
    sort: presetTags.length + current.length,
    created_at: timestamp,
    updated_at: timestamp,
  }
  const outbox = await buildOutboxRecord({
    entityType: 'tag',
    entityId: tag.id,
    action: 'upsert',
    baseUpdatedAt: null,
    clientUpdatedAt: timestamp,
    changedFields: ['name', 'emoji', 'color', 'sort'],
    payload: { ...tag },
  })
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO tags (
        id, name, emoji, color, sort, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      tag.id,
      tag.name,
      tag.emoji,
      tag.color,
      tag.sort,
      tag.created_at,
      tag.updated_at,
    )
    await enqueueOutbox(transaction, outbox)
  })
  return tag
}
