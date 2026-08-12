import type { SQLiteDatabase } from 'expo-sqlite'
import { presetTags } from '@tickcap/tokens'
import { migrateDatabase } from './migrations'

export const DATABASE_NAME = 'tickcap.db'

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await migrateDatabase(db)
  const timestamp = new Date().toISOString()
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const [sort, tag] of presetTags.entries()) {
      await transaction.runAsync(
        `INSERT INTO tags (
          id, name, emoji, color, sort, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          emoji = excluded.emoji,
          color = excluded.color,
          sort = excluded.sort,
          updated_at = excluded.updated_at`,
        tag.entityId,
        tag.name,
        tag.emoji,
        tag.color,
        sort,
        timestamp,
        timestamp,
      )
    }
  })
}
