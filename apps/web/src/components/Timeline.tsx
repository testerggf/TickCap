'use client'
import { useEffect, useMemo, useState } from 'react'
import { computeGaps } from '@tickcap/core'
import { fmtDuration, fmtHM, spanMinutes } from '@/lib/format'
import { resolveTag, type CustomTag } from '@/lib/tags'
import type { CapsuleRec } from '@/lib/store'

const MOOD_EMOJI = ['', '😫', '😕', '😐', '🙂', '🤩']

interface Props {
  capsules: CapsuleRec[]
  customTags: CustomTag[]
  timezone: string
  isToday?: boolean
  readOnly?: boolean
  onSelect?: (c: CapsuleRec) => void
  onGapClick?: (startIso: string, endIso: string) => void
}

type Item =
  | { type: 'capsule'; c: CapsuleRec; overlapped: boolean }
  | { type: 'gap'; startIso: string; endIso: string; minutes: number }

export function Timeline({ capsules, customTags, timezone, isToday, readOnly, onSelect, onGapClick }: Props) {
  // “现在线”每 30s 刷新（06 §4.1）
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!isToday) return
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [isToday])

  const items = useMemo<Item[]>(() => {
    const spans = capsules.map((c) => ({ startAt: new Date(c.startAt), endAt: new Date(c.endAt) }))
    const gaps = computeGaps(spans, isToday ? { now } : {})
    const list: Item[] = []
    let cursor = 0
    for (const c of capsules) {
      const start = new Date(c.startAt).getTime()
      list.push({ type: 'capsule', c, overlapped: start < cursor })
      cursor = Math.max(cursor, new Date(c.endAt).getTime())
    }
    for (const g of gaps) {
      list.push({ type: 'gap', startIso: g.startAt.toISOString(), endIso: g.endAt.toISOString(), minutes: g.minutes })
    }
    return list.sort((a, b) => {
      const ta = a.type === 'capsule' ? a.c.startAt : a.startIso
      const tb = b.type === 'capsule' ? b.c.startAt : b.startIso
      return ta.localeCompare(tb)
    })
  }, [capsules, isToday, now])

  if (capsules.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div
          className="flex h-16 w-40 items-center justify-center rounded-[20px] border-2 border-dashed"
          style={{ borderColor: 'var(--tc-border)' }}
        >
          <span className="t3 text-sm">空胶囊</span>
        </div>
        <p className="t3 text-sm">滴答一下，装进今天的第一颗胶囊</p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4">
      {items.map((item, i) => {
        if (item.type === 'gap') {
          return (
            <div key={`g${i}`} className="flex gap-2 pb-2">
              <div className="tnum w-11 shrink-0" />
              <div className="relative w-3.5 shrink-0">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2" style={{ background: 'var(--tc-border)' }} />
              </div>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onGapClick?.(item.startIso, item.endIso)}
                className="press t3 my-0.5 flex-1 rounded-[16px] border-2 border-dashed px-3 py-2.5 text-center text-xs"
                style={{ borderColor: 'var(--tc-border)' }}
              >
                {fmtDuration(item.minutes)} 空白{readOnly ? '' : ' · 补一颗？'}
              </button>
            </div>
          )
        }

        const c = item.c
        const tag = resolveTag(c.tagIds[0] ?? '', customTags)
        const dur = spanMinutes(c.startAt, c.endAt)
        const height = Math.max(48, Math.min(120, 34 + dur * 0.35))
        return (
          <div key={c.id} className="flex gap-2 pb-2">
            <div className="tnum t3 w-11 shrink-0 pt-1.5 text-right text-[10px]">{fmtHM(c.startAt, timezone)}</div>
            <div className="relative w-3.5 shrink-0">
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2" style={{ background: 'var(--tc-border)' }} />
              <div className="absolute left-1/2 top-1.5 -translate-x-1/2">
                {c.mood ? (
                  <span className="text-[11px]">{MOOD_EMOJI[c.mood]}</span>
                ) : (
                  <span
                    className="block h-2.5 w-2.5 rounded-full border-2"
                    style={{ background: tag.color, borderColor: 'var(--tc-bg)' }}
                  />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect?.(c)}
              className={`glass glass-on press pop-in relative flex-1 rounded-[20px] px-3.5 py-2 text-left ${item.overlapped ? 'ml-5' : ''}`}
              style={{ minHeight: height, boxShadow: `0 6px 18px ${tag.color}2E, inset 0 1px 0 rgba(255,255,255,.45)` }}
            >
              <span
                className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full"
                style={{ background: tag.color, filter: 'saturate(1.4)' }}
              />
              <div className="flex items-start justify-between gap-2 pl-2">
                <span className="t1 text-[13px] font-bold leading-snug">
                  {tag.emoji} {c.summary || tag.name}
                  {c.isHighlight && ' ⭐'}
                  {c.isPrivate && ' 🔒'}
                </span>
                <span className="tnum t3 shrink-0 pt-0.5 text-[10px]">{fmtDuration(dur)}</span>
              </div>
              {c.detail && <p className="t2 line-clamp-2 pl-2 pt-0.5 text-[11px]">{c.detail}</p>}
            </button>
          </div>
        )
      })}

      {isToday && (
        <div className="flex items-center gap-1.5 pl-[52px] pr-1 pt-1">
          <span className="breathe h-2 w-2 rounded-full" style={{ background: 'var(--tc-primary)' }} />
          <span className="h-px flex-1 opacity-75" style={{ background: 'var(--tc-primary)' }} />
          <span className="tnum text-primary text-[10px] font-bold">{fmtHM(now.toISOString(), timezone)}</span>
        </div>
      )}
    </div>
  )
}
