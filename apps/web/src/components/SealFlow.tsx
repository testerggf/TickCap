'use client'
/** 封存三幕仪式（06 §4.3）：回放 → 复盘（AI 优先本地兜底）→ 封存动画 + streak。 */
import { useEffect, useState } from 'react'
import { useStore, type CapsuleRec } from '@/lib/store'
import { buildDayContext, generateReview, type ReviewResult } from '@/lib/review'
import { fmtDateCn, fmtHM } from '@/lib/format'
import { resolveTag } from '@/lib/tags'
import { Markdown } from './Markdown'

type Step = 'replay' | 'review' | 'done'

export function SealFlow({ date, capsules, onClose }: { date: string; capsules: CapsuleRec[]; onClose: () => void }) {
  const store = useStore()
  const [step, setStep] = useState<Step>('replay')
  const [review, setReview] = useState<ReviewResult | null>(null)
  const [note, setNote] = useState('')
  const [streak, setStreak] = useState(0)

  // 第一幕：2s 回放后自动进入复盘
  useEffect(() => {
    if (step !== 'replay') return
    const t = setTimeout(() => setStep('review'), 2200)
    return () => clearTimeout(t)
  }, [step])

  // 复盘生成（进入组件即开始，不等回放结束）
  useEffect(() => {
    const prevSeal = store.seals[date]
    const ctx = buildDayContext(date, capsules, store.customTags, store.settings.timezone, prevSeal?.streak ?? 0)
    let cancelled = false
    void generateReview(ctx).then((r) => {
      if (!cancelled) setReview(r)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seal = () => {
    if (!review) return
    const s = store.sealDay(date, note, review)
    setStreak(s.streak)
    setStep('done')
    setTimeout(onClose, 2000)
  }

  return (
    <div className="aurora fixed inset-0 z-[60] overflow-y-auto" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-5 py-8">
        {step === 'replay' && (
          <div className="flex flex-1 flex-col">
            <p className="t2 pb-1 text-center text-sm">这是你的</p>
            <h2 className="t1 pb-6 text-center text-2xl font-extrabold">{fmtDateCn(date)}</h2>
            <div className="space-y-2">
              {capsules.map((c, i) => {
                const tag = resolveTag(c.tagIds[0] ?? '', store.customTags)
                return (
                  <div
                    key={c.id}
                    className="glass pop-in rounded-[16px] px-4 py-2.5"
                    style={{ animationDelay: `${Math.min(i * 160, 1800)}ms`, animationFillMode: 'backwards' }}
                  >
                    <span className="tnum t3 pr-2 text-[10px]">{fmtHM(c.startAt, store.settings.timezone)}</span>
                    <span className="t1 text-sm font-semibold">
                      {tag.emoji} {c.summary || tag.name}
                    </span>
                  </div>
                )
              })}
            </div>
            <button type="button" onClick={() => setStep('review')} className="t3 pt-6 text-center text-xs">
              跳过 ›
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="fade-up flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="t1 text-xl font-extrabold">{fmtDateCn(date)} · 复盘</h2>
              <button type="button" onClick={onClose} className="t3 press text-sm">
                取消
              </button>
            </div>

            <div className="bg-surface rounded-[20px] p-4">
              {review ? (
                <>
                  <div className="flex justify-end pb-1">
                    <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      {review.generatedBy === 'ai' ? 'AI 生成 · 可编辑' : '本地生成（未配置 AI）'}
                    </span>
                  </div>
                  <Markdown text={review.contentMd} />
                </>
              ) : (
                <p className="t3 breathe py-8 text-center text-sm">正在为你整理这一天…</p>
              )}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="补一笔：AI 说得对吗？写一句你自己的话…"
              rows={2}
              className="glass t1 w-full resize-none rounded-[16px] px-4 py-3 text-sm outline-none"
            />

            <button
              type="button"
              onClick={seal}
              disabled={!review}
              className="grad-action press mt-auto w-full rounded-full py-3.5 text-base font-bold disabled:opacity-50"
              style={{ boxShadow: '0 8px 24px rgba(255,79,160,.45)' }}
            >
              🌙 封存今日
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="sink glass flex h-24 w-44 items-center justify-center rounded-[28px] text-3xl">💊</div>
            <p className="pop-in t1 text-2xl font-extrabold" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
              {fmtDateCn(date)}，封存完毕
            </p>
            <p className="pop-in text-primary text-lg font-bold" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
              连续第 {streak} 天 🔥
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
