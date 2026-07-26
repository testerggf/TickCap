'use client'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { Markdown } from '@/components/Markdown'
import { useStore } from '@/lib/store'
import { fmtDateCn } from '@/lib/format'

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsInner />
    </AppShell>
  )
}

function ReportsInner() {
  const store = useStore()
  const reports = Object.values(store.reports).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="min-h-dvh px-4 pb-24 pt-6">
      <h1 className="t1 px-1 pb-4 text-xl font-extrabold">报告</h1>

      <div className="glass mb-4 rounded-[20px] px-4 py-3">
        <p className="t2 text-xs">📊 周报 / 月报 / 年度报告 · 敬请期待（下一里程碑）</p>
      </div>

      {reports.length === 0 ? (
        <p className="t3 py-16 text-center text-sm">封存第一天后，这里会出现你的日复盘</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link key={r.date} href={`/archive/${r.date}`} className="block">
              <div className="bg-surface press rounded-[20px] p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="t1 text-sm font-bold">{fmtDateCn(r.date)}</span>
                  <span className="t3 text-[10px]">{r.generatedBy === 'ai' ? 'AI' : '本地'}</span>
                </div>
                <div className="max-h-28 overflow-hidden">
                  <Markdown text={r.contentMd.split('\n').slice(0, 4).join('\n')} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
