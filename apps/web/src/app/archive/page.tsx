'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { MonthCalendar } from '@/components/Calendar'
import { useStore } from '@/lib/store'

export default function ArchivePage() {
  return (
    <AppShell>
      <ArchiveInner />
    </AppShell>
  )
}

function ArchiveInner() {
  const store = useStore()
  const router = useRouter()
  const [month, setMonth] = useState(() => store.today().slice(0, 7))

  const sealedCount = Object.keys(store.seals).length
  const total = store.capsules.length

  return (
    <div className="min-h-dvh px-4 pb-24 pt-6">
      <h1 className="t1 px-1 pb-1 text-xl font-extrabold">档案馆</h1>
      <p className="t3 px-1 pb-4 text-xs">
        共 {total} 颗胶囊 · 封存 {sealedCount} 天
      </p>
      <MonthCalendar month={month} onMonthChange={setMonth} onPick={(d) => router.push(`/archive/${d}`)} />
    </div>
  )
}
