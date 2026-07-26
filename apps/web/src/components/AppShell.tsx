'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { TabBar } from './TabBar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated)
  const onboarded = useStore((s) => s.onboarded)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    void useStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!onboarded && pathname !== '/onboarding') router.replace('/onboarding')
    if (onboarded && (pathname === '/onboarding' || pathname === '/')) router.replace('/today')
  }, [hydrated, onboarded, pathname, router])

  if (!hydrated) {
    return (
      <div className="aurora flex min-h-dvh items-center justify-center">
        <div className="pop-in text-4xl">⏳</div>
      </div>
    )
  }

  const showTab = onboarded && pathname !== '/onboarding'
  return (
    <div className="mx-auto min-h-dvh max-w-[560px]">
      {children}
      {showTab && <TabBar />}
    </div>
  )
}
