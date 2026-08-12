import type { SQLiteDatabase } from 'expo-sqlite'
import { LOCAL_SCHEMA_VERSION } from '@tickcap/api'

interface UserVersionRow {
  user_version: number
}

const MIGRATION_V1 = `
  CREATE TABLE IF NOT EXISTS local_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    parent_id TEXT REFERENCES tags(id),
    sort INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS capsules (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    tag_ids_json TEXT NOT NULL DEFAULT '[]',
    summary TEXT,
    detail TEXT,
    mood INTEGER CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
    source TEXT NOT NULL CHECK (
      source IN ('manual', 'backfill', 'onboarding', 'notification', 'calendar_draft')
    ),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed')),
    is_highlight INTEGER NOT NULL DEFAULT 0 CHECK (is_highlight IN (0, 1)),
    is_private INTEGER NOT NULL DEFAULT 0 CHECK (is_private IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    CHECK (julianday(end_at) > julianday(start_at)),
    CHECK ((julianday(end_at) - julianday(start_at)) * 86400 <= 86400)
  );

  CREATE INDEX IF NOT EXISTS idx_capsules_date_start
    ON capsules(date, deleted_at, start_at);

  CREATE TABLE IF NOT EXISTS day_seals (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL UNIQUE,
    sealed_at TEXT NOT NULL,
    first_sealed_at TEXT NOT NULL,
    note TEXT,
    streak INTEGER NOT NULL CHECK (streak >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_reports (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'yearly')),
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    template_id TEXT,
    persona TEXT,
    content_md TEXT,
    edited_md TEXT,
    model TEXT,
    prompt_version TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    status TEXT NOT NULL CHECK (status IN ('pending', 'streaming', 'done', 'failed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS outbox (
    op_id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('upsert', 'delete')),
    base_updated_at TEXT,
    client_updated_at TEXT NOT NULL,
    changed_fields_json TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_retry_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_outbox_retry
    ON outbox(next_retry_at, created_at, op_id);

  CREATE TABLE IF NOT EXISTS sync_conflicts (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field TEXT NOT NULL CHECK (field = 'detail'),
    local_value_json TEXT NOT NULL,
    server_value_json TEXT NOT NULL,
    server_updated_at TEXT NOT NULL,
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS event_outbox (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    props_json TEXT NOT NULL,
    ts TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
  );
`

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

  const versionRow = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version')
  const currentVersion = versionRow?.user_version ?? 0

  if (currentVersion > LOCAL_SCHEMA_VERSION) {
    throw new Error(
      `本地数据库版本 ${currentVersion} 高于客户端支持版本 ${LOCAL_SCHEMA_VERSION}`,
    )
  }
  if (currentVersion === LOCAL_SCHEMA_VERSION) return

  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (currentVersion < 1) {
      await transaction.execAsync(MIGRATION_V1)
      await transaction.runAsync(
        `INSERT INTO local_meta (key, value) VALUES ('schema_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        String(LOCAL_SCHEMA_VERSION),
      )
      await transaction.execAsync(`PRAGMA user_version = ${LOCAL_SCHEMA_VERSION}`)
    }
  })
}
