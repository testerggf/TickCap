'use client'
/** Onboarding 三屏（06 §4.6）：30 秒内完成第一颗胶囊。 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { useStore } from '@/lib/store'
import { minToHM } from '@/lib/format'

const FIRST_TICKS = [
  { tagId: 'preset:wake', label: '☀️ 刚起床' },
  { tagId: 'preset:slack', label: '🌫 正在摸鱼' },
  { tagId: 'preset:muse', label: '💭 随便看看' },
]

export default function OnboardingPage() {
  return (
    <AppShell>
      <OnboardingInner />
    </AppShell>
  )
}

function OnboardingInner() {
  const store = useStore()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [ticked, setTicked] = useState(false)

  const firstTick = (tagId: string) => {
    store.tick({ tagIds: [tagId], source: 'onboarding' })
    setTicked(true)
    setTimeout(() => setStep(3), 900)
  }

  const finish = () => {
    store.finishOnboarding()
    router.replace('/today')
  }

  return (
    <div className="aurora flex min-h-dvh flex-col px-6 py-10">
      {step === 1 && (
        <div className="fade-up flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <div className="pop-in glass flex h-20 w-40 items-center justify-center rounded-[28px] text-4xl">💊</div>
          <h1 className="t1 text-2xl font-extrabold">把每一刻装进胶囊</h1>
          <p className="t2 max-w-72 text-sm leading-relaxed">
            3 秒记下你正在做的事，一天自动串成时间轴，晚上封存时为你生成复盘。日子不再白过。
          </p>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="grad-action press mt-4 rounded-full px-10 py-3.5 text-base font-bold"
            style={{ boxShadow: '0 8px 24px rgba(255,79,160,.45)' }}
          >
            开始
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="fade-up flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 className="t1 text-2xl font-extrabold">你现在在做什么？</h1>
          <p className="t2 text-sm">点一下，就完成了你的第一颗时间胶囊</p>
          <div className="flex w-full max-w-72 flex-col gap-3 pt-2">
            {FIRST_TICKS.map((t) => (
              <button
                key={t.tagId}
                type="button"
                disabled={ticked}
                onClick={() => firstTick(t.tagId)}
                className="glass glass-on press t1 rounded-[20px] py-4 text-base font-bold"
              >
                {t.label}
              </button>
            ))}
          </div>
          {ticked && <p className="pop-in text-primary text-sm font-bold">✓ 已挂上你的时间轴</p>}
        </div>
      )}

      {step === 3 && (
        <div className="fade-up flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 className="t1 text-2xl font-extrabold">每晚几点提醒你封存？</h1>
          <p className="t2 max-w-72 text-sm">封存 = 给一天画句号：AI 帮你复盘，胶囊沉入档案馆</p>
          <input
            type="time"
            value={minToHM(store.settings.sealRemindMin)}
            onChange={(e) => {
              if (!e.target.value) return
              const [h, m] = e.target.value.split(':').map(Number)
              store.updateSettings({ sealRemindMin: h! * 60 + m! })
            }}
            className="glass t1 tnum rounded-[16px] px-6 py-3 text-2xl font-bold outline-none"
          />
          <p className="t3 max-w-64 text-[11px]">Web 版提醒需将 TickCap 添加到主屏幕；间隔提醒等完整体验在 App 版</p>
          <button
            type="button"
            onClick={finish}
            className="grad-action press mt-2 rounded-full px-10 py-3.5 text-base font-bold"
            style={{ boxShadow: '0 8px 24px rgba(255,79,160,.45)' }}
          >
            进入 TickCap
          </button>
        </div>
      )}

      <div className="flex justify-center gap-1.5 pt-6">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: i === step ? 'var(--tc-primary)' : 'var(--tc-border)' }}
          />
        ))}
      </div>
    </div>
  )
}
