'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/today', label: '今日', icon: '⏱' },
  { href: '/archive', label: '档案馆', icon: '📅' },
  { href: '/reports', label: '报告', icon: '📖' },
  { href: '/settings', label: '我的', icon: '👤' },
]

export function TabBar() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[560px] pb-[env(safe-area-inset-bottom)]">
      <div className="glass glass-on flex justify-around border-t" style={{ borderColor: 'var(--tc-border)' }}>
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className="press flex min-w-16 flex-col items-center gap-0.5 py-2"
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className={`text-[11px] font-semibold ${active ? 'text-primary' : 't3'}`}>{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
