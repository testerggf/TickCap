'use client'
import { useMemo, useState } from 'react'
import { canSealKeepingStreak } from '@tickcap/core'
import { AppShell } from '@/components/AppShell'
import { TagGrid } from '@/components/CapsuleForm'
import { Timeline } from '@/components/Timeline'
import { TickBar } from '@/components/TickBar'
import { CapsuleSheet } from '@/components/CapsuleSheet'
import { SealFlow } from '@/components/SealFlow'
import { useStore, shiftDate, type CapsuleRec } from '@/lib/store'
import { fmtDateCn, fmtHM } from '@/lib/format'

export default function TodayPage() {
  return (
    <AppShell>
      <TodayInner />
    </AppShell>
  )
}

function TodayInner() {
  const store = useStore()
  const today = store.today()
  const [date, setDate] = useState(today)
  const [selected, setSelected] = useState<CapsuleRec | null>(null)
  const [sealing, setSealing] = useState(false)
  const [backfillSpan, setBackfillSpan] = useState<{ start: string; end: string } | null>(null)

  const capsules = store.capsulesOf(date)
  const isToday = date === today
  const seal = store.seals[date]
  const latestStreak = useMemo(() => {
    const all = Object.values(store.seals).sort((a, b) => b.date.localeCompare(a.date))
    return all[0]?.streak ?? 0
  }, [store.seals])

  const canSeal =
    capsules.length > 0 && !seal && canSealKeepingStreak(date, new Date(), store.timeSettings())

  return (
    <div className="aurora min-h-dvh pb-[220px]">
      <header className="px-5 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDate(shiftDate(date, -1))} className="press t3 px-1 text-lg">
              ‹
            </button>
            <h1 className="t1 text-lg font-bold">{fmtDateCn(date)}</h1>
            <button
              type="button"
              onClick={() => setDate(shiftDate(date, 1))}
              disabled={isToday}
              className="press t3 px-1 text-lg disabled:opacity-30"
            >
              ›
            </button>
            {!isToday && (
              <button type="button" onClick={() => setDate(today)} className="bg-primary-soft text-primary press rounded-full px-2 py-0.5 text-[10px] font-semibold">
                回今天
              </button>
            )}
          </div>
          {seal ? (
            <span className="bg-primary-soft text-primary rounded-full px-3 py-1.5 text-xs font-bold">已封存 ✓</span>
          ) : (
            <button
              type="button"
              onClick={() => setSealing(true)}
              disabled={!canSeal}
              className="grad-action press rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              🌙 封存
            </button>
          )}
        </div>
        <p className="t3 pt-1 text-[11px]">
          已滴答 {capsules.length} 次{latestStreak > 0 && ` · 连续 ${latestStreak} 天`}
        </p>
      </header>

      <Timeline
        capsules={capsules}
        customTags={store.customTags}
        timezone={store.settings.timezone}
        isToday={isToday}
        onSelect={setSelected}
        onGapClick={(s, e) => setBackfillSpan({ start: s, end: e })}
      />

      {isToday && <TickBar />}

      {selected && <CapsuleSheet capsule={selected} onClose={() => setSelected(null)} />}
      {sealing && <SealFlow date={date} capsules={capsules} onClose={() => setSealing(false)} />}
      {backfillSpan && (
        <BackfillSheet date={date} span={backfillSpan} onClose={() => setBackfillSpan(null)} />
      )}
    </div>
  )
}

/** 空隙补记：长按/点击空白区段直达（02 §2.1） */
function BackfillSheet({
  date,
  span,
  onClose,
}: {
  date: string
  span: { start: string; end: string }
  onClose: () => void
}) {
  const store = useStore()
  const [tagIds, setTagIds] = useState<string[]>([])
  const [summary, setSummary] = useState('')

  const submit = () => {
    if (!tagIds.length && !summary.trim()) return
    store.backfill(date, span.start, span.end, { tagIds: tagIds.length ? tagIds : ['preset:muse'], summary })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className="glass glass-on fade-up fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[560px] rounded-t-[28px] p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <p className="t1 pb-3 text-sm font-bold">
          补记 {fmtHM(span.start, store.settings.timezone)} → {fmtHM(span.end, store.settings.timezone)}{' '}
          <span className="t3 font-normal">这段时间在做什么？</span>
        </p>
        <TagGrid
          customTags={store.customTags}
          selected={tagIds}
          onToggle={(id) => setTagIds(tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id])}
        />
        <div className="flex items-center gap-2 pt-3">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="一句话概括（可不填）"
            className="bg-surface2 t1 flex-1 rounded-[14px] px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={submit}
            className="grad-action press h-11 w-11 shrink-0 rounded-full font-bold"
            aria-label="补记"
          >
            ●
          </button>
        </div>
      </div>
    </>
  )
}
