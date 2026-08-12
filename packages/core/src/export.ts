import { getLocalParts } from './time'

export interface ExportCapsule {
  id: string
  date: string
  startAt: string
  endAt: string
  tagNames: string[]
  summary: string | null
  detail: string | null
  mood: number | null
  isHighlight: boolean
  isPrivate: boolean
}

export interface ExportSeal {
  date: string
  note: string | null
  streak: number
  sealedAt: string
}

export interface ExportReport {
  periodStart: string
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  contentMd: string | null
  editedMd: string | null
}

export interface TickCapExport {
  formatVersion: 1
  exportedAt: string
  timezone: string
  settings: Record<string, unknown>
  capsules: readonly Record<string, unknown>[]
  seals: readonly Record<string, unknown>[]
  reports: readonly Record<string, unknown>[]
  tags: readonly Record<string, unknown>[]
}

export interface MarkdownExportInput {
  timezone: string
  capsules: readonly ExportCapsule[]
  seals: readonly ExportSeal[]
  reports: readonly ExportReport[]
}

function clock(iso: string, timezone: string): string {
  const parts = getLocalParts(new Date(iso), timezone)
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

export function buildTickCapMarkdown(input: MarkdownExportInput): string {
  const dates = [...new Set(input.capsules.map((capsule) => capsule.date))].sort()
  const lines = ['# TickCap 导出', '']

  for (const date of dates) {
    lines.push(`## ${date}`, '')
    for (const capsule of input.capsules
      .filter((item) => item.date === date)
      .sort((left, right) => left.startAt.localeCompare(right.startAt))) {
      const tags = capsule.tagNames.length ? ` ${capsule.tagNames.join(' / ')}` : ''
      const summary = capsule.summary ? ` ${capsule.summary}` : ''
      const detail = capsule.detail ? `｜${capsule.detail}` : ''
      const privacy = capsule.isPrivate ? ' 🔒' : ''
      lines.push(
        `- ${clock(capsule.startAt, input.timezone)}–${clock(capsule.endAt, input.timezone)}${tags}${summary}${detail}${privacy}`,
      )
    }

    const seal = input.seals.find((item) => item.date === date)
    if (seal) {
      lines.push('', `### 封存 · 连续 ${seal.streak} 天`)
      if (seal.note) lines.push('', seal.note)
    }
    const report = input.reports.find(
      (item) => item.type === 'daily' && item.periodStart === date,
    )
    const review = report?.editedMd ?? report?.contentMd
    if (review) lines.push('', '### 复盘', '', review)
    lines.push('')
  }
  return lines.join('\n')
}

export function buildTickCapJson(input: TickCapExport): string {
  return JSON.stringify(input, null, 2)
}
