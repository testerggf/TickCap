'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Timeline } from '@/components/Timeline'
import { Markdown } from '@/components/Markdown'
import { useStore } from '@/lib/store'
import { fmtDateCn } from '@/lib/format'

export default function ArchiveDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params)
  return (
    <AppShell>
      <DayInner date={date} />
    </AppShell>
  )
}

function DayInner({ date }: { date: string }) {
  const store = useStore()
  const router = useRouter()
  const capsules = store.capsulesOf(date)
  const seal = store.seals[date]
  const report = store.reports[date]

  return (
    <div className="min-h-dvh pb-24 pt-6">
      <header className="flex items-center gap-2 px-5 pb-3">
        <button type="button" onClick={() => router.back()} className="press t2 text-lg">
          ‹
        </button>
        <h1 className="t1 text-lg font-bold">{fmtDateCn(date)}</h1>
        {seal && (
          <span className="bg-primary-soft text-primary ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold">
            已封存 · 连续第 {seal.streak} 天
          </span>
        )}
      </header>

      {capsules.length === 0 ? (
        <p className="t3 py-16 text-center text-sm">这一天没有记录</p>
      ) : (
        <Timeline capsules={capsules} customTags={store.customTags} timezone={store.settings.timezone} readOnly />
      )}

      {report && (
        <section className="px-4 pt-2">
          <div className="bg-surface rounded-[20px] p-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="t1 text-sm font-bold">当日复盘</h2>
              <span className="t3 text-[10px]">{report.generatedBy === 'ai' ? 'AI 生成' : '本地生成'}</span>
            </div>
            <Markdown text={report.contentMd} />
            {seal?.note && (
              <p className="t1 mt-3 rounded-[12px] px-3 py-2 text-sm" style={{ background: 'var(--tc-primary-soft)' }}>
                ✍️ {seal.note}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
