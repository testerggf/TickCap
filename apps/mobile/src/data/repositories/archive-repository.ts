import type { SQLiteDatabase } from 'expo-sqlite'
import type {
  AiReportEntity,
  CapsuleEntity,
  DaySealEntity,
} from '@tickcap/api'
import { listCapsulesByDate } from './capsule-repository'
import { getSealByDate, listDailyReports } from './seal-repository'
import { listTags, type LocalTag } from './tag-repository'

export interface ArchiveDayDetail {
  date: string
  capsules: CapsuleEntity[]
  seal: DaySealEntity | null
  report: AiReportEntity | null
  tags: LocalTag[]
}

export interface RecordedDay {
  date: string
  capsule_count: number
  streak: number | null
  top_tag_color: string | null
}

export async function listRecordedDays(
  db: SQLiteDatabase,
): Promise<RecordedDay[]> {
  return db.getAllAsync<RecordedDay>(
    `SELECT
       c.date,
       COUNT(c.id) AS capsule_count,
       MAX(ds.streak) AS streak,
       (
         SELECT t.color
         FROM capsules ranked
         LEFT JOIN tags t
           ON t.id = json_extract(ranked.tag_ids_json, '$[0]')
         WHERE ranked.date = c.date
           AND ranked.deleted_at IS NULL
         GROUP BY t.id, t.color
         ORDER BY SUM(
           (julianday(ranked.end_at) - julianday(ranked.start_at)) * 86400
         ) DESC
         LIMIT 1
       ) AS top_tag_color
     FROM capsules c
     LEFT JOIN day_seals ds
       ON ds.date = c.date AND ds.deleted_at IS NULL
     WHERE c.deleted_at IS NULL
     GROUP BY c.date
     ORDER BY c.date DESC`,
  )
}

export async function getArchiveDayDetail(
  db: SQLiteDatabase,
  date: string,
): Promise<ArchiveDayDetail> {
  const [capsules, seal, reports, tags] = await Promise.all([
    listCapsulesByDate(db, date),
    getSealByDate(db, date),
    listDailyReports(db),
    listTags(db),
  ])
  return {
    date,
    capsules: [...capsules].sort((left, right) =>
      left.start_at.localeCompare(right.start_at),
    ),
    seal,
    report:
      reports.find((candidate) => candidate.period_start === date) ?? null,
    tags,
  }
}
