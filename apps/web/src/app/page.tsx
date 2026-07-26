'use client'
import { AppShell } from '@/components/AppShell'

/** 根路由由 AppShell 决定去向（onboarding / today） */
export default function Home() {
  return (
    <AppShell>
      <div />
    </AppShell>
  )
}
