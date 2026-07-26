'use client'
/** 档案馆月历（06 §4.4）：每天一个色点 = 当日时长占比最高的标签色；封存加描边。 */
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { resolveTag } from '@/lib/tags'
import { spanMinutes } from '@/lib/format'

export function MonthCalendar({
  month, // YYYY-MM
  onPick,
  onMonthChange,
}: {
  month: string
  onPick: (date: string) => void
  onMonthChange: (month: string) => void
}) {
  const store = useStore()
  const today = store.today()

  const days = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const first = new Date(Date.UTC(y!, m! - 1, 1))
    const daysInMonth = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
    const lead = first.getUTCDay() // 周日起
    const cells: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${month}-${String(d).padStart(2, '0')}`)
    }
    return cells
  }, [month])

  const dayInfo = useMemo(() => {
    const info: Record<string, { color: string; count: number }> = {}
    const byDate: Record<string, Record<string, number>> = {}
    for (const c of store.capsules) {
      if (!c.date.startsWith(month)) continue
      const tag = resolveTag(c.tagIds[0] ?? '', store.customTags)
      byDate[c.date] ??= {}
      byDate[c.date]![tag.color] = (byDate[c.date]![tag.color] ?? 0) + spanMinutes(c.startAt, c.endAt)
    }
    for (const [date, colors] of Object.entries(byDate)) {
      const top = Object.entries(colors).sort((a, b) => b[1] - a[1])[0]!
      info[date] = { color: top[0], count: Object.values(colors).length }
    }
    return info
  }, [store.capsules, store.customTags, month])

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(Date.UTC(y!, m! - 1 + delta, 1))
    onMonthChange(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="glass glass-on rounded-[24px] p-4">
      <div className="flex items-center justify-between pb-3">
        <button type="button" onClick={() => shiftMonth(-1)} className="press t2 px-2 text-lg">
          ‹
        </button>
        <span className="t1 text-base font-bold">{month.replace('-', ' 年 ')} 月</span>
        <button type="button" onClick={() => shiftMonth(1)} className="press t2 px-2 text-lg">
          ›
        </button>
      </div>
      <div className="t3 grid grid-cols-7 pb-1 text-center text-[10px]">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5">
        {days.map((date, i) =>
          date ? (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className="press flex flex-col items-center gap-1 py-1"
            >
              <span className={`tnum text-xs ${date === today ? 'text-primary font-bold' : 't2'}`}>
                {Number(date.slice(-2))}
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: dayInfo[date]?.color ?? 'var(--tc-border)',
                  boxShadow: store.seals[date] ? '0 0 0 2px var(--tc-primary-soft), 0 0 0 3.5px var(--tc-primary)' : undefined,
                  opacity: dayInfo[date] ? 1 : 0.35,
                }}
              />
            </button>
          ) : (
            <span key={`x${i}`} />
          ),
        )}
      </div>
      <p className="t3 pt-3 text-center text-[10px]">色点 = 当日主要标签 · 粉圈 = 已封存</p>
    </div>
  )
}
