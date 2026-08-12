import type { SQLiteDatabase } from 'expo-sqlite'

export interface ProbeEvent {
  id: string
  kind: 'manual' | 'notification'
  detail: string
  createdAt: string
}

export async function migrateProbeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS g1_probe_events (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('manual', 'notification')),
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
}

export async function addProbeEvent(
  db: SQLiteDatabase,
  kind: ProbeEvent['kind'],
  detail: string,
): Promise<ProbeEvent> {
  const event: ProbeEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    detail,
    createdAt: new Date().toISOString(),
  }

  await db.runAsync(
    'INSERT INTO g1_probe_events (id, kind, detail, created_at) VALUES (?, ?, ?, ?)',
    event.id,
    event.kind,
    event.detail,
    event.createdAt,
  )
  return event
}

export async function listProbeEvents(db: SQLiteDatabase): Promise<ProbeEvent[]> {
  const rows = await db.getAllAsync<{
    id: string
    kind: ProbeEvent['kind']
    detail: string
    created_at: string
  }>('SELECT id, kind, detail, created_at FROM g1_probe_events ORDER BY created_at DESC LIMIT 20')

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    detail: row.detail,
    createdAt: row.created_at,
  }))
}
