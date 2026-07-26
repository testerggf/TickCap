'use client'
/**
 * 本地优先数据层（里程碑 M1：本地模式）。
 * 领域规则一律来自 @tickcap/core；本文件只做存取与组装。
 * 存储结构带 id/时间戳，未来切服务端同步不改数据形状（07 §3 同款字段）。
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  attributeDate,
  computeStreak,
  inferTimes,
  logicalToday,
  type UserTimeSettings,
} from '@tickcap/core'
import type { CustomTag } from './tags'

export type CapsuleSource = 'manual' | 'backfill' | 'onboarding'

export interface CapsuleRec {
  id: string
  date: string
  startAt: string // ISO
  endAt: string
  tagIds: string[]
  summary?: string
  detail?: string
  mood?: 1 | 2 | 3 | 4 | 5
  isHighlight?: boolean
  isPrivate?: boolean
  source: CapsuleSource
  createdAt: string
  updatedAt: string
}

export interface SealRec {
  date: string
  sealedAt: string
  firstSealedAt: string
  note?: string
  streak: number
}

export interface ReportRec {
  date: string
  contentMd: string
  generatedBy: 'ai' | 'local'
  createdAt: string
}

export interface Settings {
  timezone: string
  dayBoundaryMin: number
  wakeDefaultMin: number
  nickname: string
  sealRemindMin: number
  reminderIntervalMin: number
}

interface TickInput {
  tagIds: string[]
  summary?: string
  detail?: string
  mood?: CapsuleRec['mood']
  startAt?: string
  endAt?: string
  source?: CapsuleSource
}

interface State {
  hydrated: boolean
  onboarded: boolean
  capsules: CapsuleRec[]
  seals: Record<string, SealRec>
  reports: Record<string, ReportRec>
  customTags: CustomTag[]
  settings: Settings

  setHydrated: () => void
  finishOnboarding: () => void
  updateSettings: (patch: Partial<Settings>) => void
  timeSettings: () => UserTimeSettings
  today: () => string

  tick: (input: TickInput) => CapsuleRec
  backfill: (date: string, startAt: string, endAt: string, input: Omit<TickInput, 'startAt' | 'endAt'>) => CapsuleRec
  updateCapsule: (id: string, patch: Partial<CapsuleRec>) => void
  deleteCapsule: (id: string) => void
  capsulesOf: (date: string) => CapsuleRec[]

  sealDay: (date: string, note: string | undefined, report: { contentMd: string; generatedBy: 'ai' | 'local' }) => SealRec
  unseal: (date: string) => void

  addCustomTag: (tag: Omit<CustomTag, 'id' | 'custom'>) => void
  tagUsage: () => Record<string, number>
}

const defaultSettings = (): Settings => ({
  timezone:
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
      : 'Asia/Shanghai',
  dayBoundaryMin: 4 * 60,
  wakeDefaultMin: 7 * 60,
  nickname: '',
  sealRemindMin: 21 * 60 + 30,
  reminderIntervalMin: 60,
})

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      capsules: [],
      seals: {},
      reports: {},
      customTags: [],
      settings: defaultSettings(),

      setHydrated: () => set({ hydrated: true }),
      finishOnboarding: () => set({ onboarded: true }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      timeSettings: () => {
        const s = get().settings
        return { timezone: s.timezone, dayBoundaryMin: s.dayBoundaryMin, wakeDefaultMin: s.wakeDefaultMin }
      },
      today: () => logicalToday(new Date(), get().timeSettings()),

      tick: (input) => {
        const ts = get().timeSettings()
        const now = new Date()
        const todayStr = logicalToday(now, ts)
        const todays = get().capsulesOf(todayStr)
        const last = todays.length ? todays[todays.length - 1] : null

        let startAt: string, endAt: string
        if (input.startAt && input.endAt) {
          startAt = input.startAt
          endAt = input.endAt
        } else {
          const span = inferTimes({ now, lastCapsuleEndAt: last ? new Date(last.endAt) : null, settings: ts })
          startAt = span.startAt.toISOString()
          endAt = span.endAt.toISOString()
        }

        const nowIso = now.toISOString()
        const rec: CapsuleRec = {
          id: uuid(),
          date: attributeDate(new Date(startAt), ts),
          startAt,
          endAt,
          tagIds: input.tagIds,
          summary: input.summary?.trim() || undefined,
          detail: input.detail?.trim() || undefined,
          mood: input.mood,
          source: input.source ?? 'manual',
          createdAt: nowIso,
          updatedAt: nowIso,
        }
        set({ capsules: [...get().capsules, rec] })
        return rec
      },

      backfill: (date, startAt, endAt, input) => {
        const nowIso = new Date().toISOString()
        const rec: CapsuleRec = {
          id: uuid(),
          date,
          startAt,
          endAt,
          tagIds: input.tagIds,
          summary: input.summary?.trim() || undefined,
          detail: input.detail?.trim() || undefined,
          mood: input.mood,
          source: 'backfill',
          createdAt: nowIso,
          updatedAt: nowIso,
        }
        set({ capsules: [...get().capsules, rec] })
        return rec
      },

      updateCapsule: (id, patch) => {
        const ts = get().timeSettings()
        set({
          capsules: get().capsules.map((c) => {
            if (c.id !== id) return c
            const next = { ...c, ...patch, updatedAt: new Date().toISOString() }
            // 改开始时刻会重算归属日（07 §4.2 PATCH 语义）
            next.date = attributeDate(new Date(next.startAt), ts)
            return next
          }),
        })
      },

      deleteCapsule: (id) => set({ capsules: get().capsules.filter((c) => c.id !== id) }),

      capsulesOf: (date) =>
        get()
          .capsules.filter((c) => c.date === date)
          .sort((a, b) => a.startAt.localeCompare(b.startAt)),

      sealDay: (date, note, report) => {
        const ts = get().timeSettings()
        const prevDate = shift(date, -1)
        const prev = get().seals[prevDate]
        const existing = get().seals[date]
        const nowIso = new Date().toISOString()

        const streak = existing
          ? existing.streak
          : computeStreak(
              prev ? { date: prev.date, firstSealedAt: new Date(prev.firstSealedAt), streak: prev.streak } : null,
              date,
              ts,
            )

        const seal: SealRec = {
          date,
          sealedAt: nowIso,
          firstSealedAt: existing?.firstSealedAt ?? nowIso,
          note: note?.trim() || existing?.note,
          streak,
        }
        set({
          seals: { ...get().seals, [date]: seal },
          reports: {
            ...get().reports,
            [date]: { date, contentMd: report.contentMd, generatedBy: report.generatedBy, createdAt: nowIso },
          },
        })
        return seal
      },

      unseal: (date) => {
        const seals = { ...get().seals }
        delete seals[date]
        set({ seals })
      },

      addCustomTag: (tag) =>
        set({ customTags: [...get().customTags, { ...tag, id: `custom:${uuid()}`, custom: true }] }),

      tagUsage: () => {
        const usage: Record<string, number> = {}
        for (const c of get().capsules) {
          for (const t of c.tagIds) usage[t] = (usage[t] ?? 0) + 1
        }
        return usage
      },
    }),
    {
      name: 'tickcap-store',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        onboarded: s.onboarded,
        capsules: s.capsules,
        seals: s.seals,
        reports: s.reports,
        customTags: s.customTags,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
)

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y!, m! - 1, d! + days))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

export { shift as shiftDate }
