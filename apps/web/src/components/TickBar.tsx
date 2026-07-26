'use client'
/** 滴答栏：悬浮玻璃岛（06 §4.1）。点标签=最快路径 2 步完成；展开=渐进增强。 */
import { useMemo, useState } from 'react'
import { inferTimes } from '@tickcap/core'
import { useStore, type CapsuleRec } from '@/lib/store'
import { ALL_PRESET_TAGS, resolveTag } from '@/lib/tags'
import { fmtHM } from '@/lib/format'
import { MoodRow, TagGrid } from './CapsuleForm'

export function TickBar({ onTicked }: { onTicked?: (c: CapsuleRec) => void }) {
  const store = useStore()
  const [expanded, setExpanded] = useState(false)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [detail, setDetail] = useState('')
  const [mood, setMood] = useState<CapsuleRec['mood']>()

  const quickTags = useMemo(() => {
    const usage = store.tagUsage()
    const all = [...ALL_PRESET_TAGS, ...store.customTags]
    return [...all].sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0)).slice(0, 5)
  }, [store])

  const preview = useMemo(() => {
    if (!expanded) return null
    const todays = store.capsulesOf(store.today())
    const last = todays.length ? todays[todays.length - 1] : null
    const span = inferTimes({
      now: new Date(),
      lastCapsuleEndAt: last ? new Date(last.endAt) : null,
      settings: store.timeSettings(),
    })
    return { start: span.startAt.toISOString(), end: span.endAt.toISOString() }
  }, [expanded, store])

  const reset = () => {
    setTagIds([])
    setSummary('')
    setDetail('')
    setMood(undefined)
    setExpanded(false)
  }

  const quickTick = (tagId: string) => {
    const c = store.tick({ tagIds: [tagId] })
    onTicked?.(c)
  }

  const submit = () => {
    if (tagIds.length === 0 && !summary.trim()) return
    const ids = tagIds.length ? tagIds : ['preset:muse']
    const c = store.tick({ tagIds: ids, summary, detail, mood })
    onTicked?.(c)
    reset()
  }

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={reset} aria-hidden />
      )}
      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[560px] px-2 pb-2">
        <div className="glass glass-on fade-up rounded-[24px] p-2.5" style={{ boxShadow: '0 -4px 24px rgba(20,10,30,.10), inset 0 1px 0 rgba(255,255,255,.5)' }}>
          {expanded ? (
            <div className="space-y-3 p-1">
              {preview && (
                <div className="tnum t2 text-center text-xs">
                  {fmtHM(preview.start, store.settings.timezone)} → {fmtHM(preview.end, store.settings.timezone)}
                  <span className="t3">（自动衔接上一颗，可保存后再调）</span>
                </div>
              )}
              <TagGrid
                customTags={store.customTags}
                selected={tagIds}
                onToggle={(id) => setTagIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
              />
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="一句话概括（可不填）"
                className="bg-surface2 t1 w-full rounded-[14px] px-3 py-2.5 text-sm outline-none"
                autoFocus
              />
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="想多写点？这里放详细记录…"
                rows={2}
                className="bg-surface2 t1 w-full resize-none rounded-[14px] px-3 py-2.5 text-sm outline-none"
              />
              <div className="flex items-center justify-between">
                <MoodRow value={mood} onChange={setMood} />
                <button
                  type="button"
                  onClick={submit}
                  className="grad-action press h-12 w-12 rounded-full text-lg font-bold"
                  style={{ boxShadow: '0 8px 20px rgba(255,79,160,.5)' }}
                  aria-label="滴答"
                >
                  ●
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {quickTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => quickTick(t.id)}
                    className="glass press t2 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    {resolveTag(t.id, store.customTags).emoji} {t.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="bg-surface2 t3 flex-1 rounded-[14px] px-3 py-2.5 text-left text-sm"
                >
                  这段时间在做什么…
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="grad-action press h-11 w-11 shrink-0 rounded-full text-base font-bold"
                  style={{ boxShadow: '0 8px 20px rgba(255,79,160,.5)' }}
                  aria-label="展开记录"
                >
                  ●
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
