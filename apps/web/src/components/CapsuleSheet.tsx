'use client'
/** 胶囊详情半屏弹层（06 §4.2）：即时保存，无"保存"按钮。 */
import { useState } from 'react'
import { getLocalParts, minutesOfDay, toDateString, zonedTime } from '@tickcap/core'
import { useStore, type CapsuleRec } from '@/lib/store'
import { minToHM } from '@/lib/format'
import { MoodRow, TagGrid } from './CapsuleForm'

export function CapsuleSheet({ capsule, onClose }: { capsule: CapsuleRec; onClose: () => void }) {
  const store = useStore()
  const tz = store.settings.timezone
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patch = (p: Partial<CapsuleRec>) => store.updateCapsule(capsule.id, p)
  const live = store.capsules.find((c) => c.id === capsule.id)
  if (!live) return null

  const startMin = minutesOfDay(getLocalParts(new Date(live.startAt), tz))
  const endMin = minutesOfDay(getLocalParts(new Date(live.endAt), tz))

  const setTime = (which: 'start' | 'end', hm: string) => {
    const [h, m] = hm.split(':').map(Number)
    const min = h! * 60 + m!
    const baseIso = which === 'start' ? live.startAt : live.endAt
    const baseDate = toDateString(getLocalParts(new Date(baseIso), tz))
    let next = zonedTime(baseDate, min, tz)
    if (which === 'end' && next.getTime() <= new Date(live.startAt).getTime()) {
      next = zonedTime(baseDate, min + 1440, tz) // 结束早于开始 → 视为次日（跨零点胶囊）
    }
    patch(which === 'start' ? { startAt: next.toISOString() } : { endAt: next.toISOString() })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className="glass glass-on fade-up fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[560px] rounded-t-[28px] p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--tc-border)' }} />
        <div className="max-h-[70dvh] space-y-4 overflow-y-auto">
          <TagGrid
            customTags={store.customTags}
            selected={live.tagIds}
            onToggle={(id) =>
              patch({
                tagIds: live.tagIds.includes(id)
                  ? live.tagIds.filter((x) => x !== id)
                  : [...live.tagIds, id],
              })
            }
          />
          <input
            value={live.summary ?? ''}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="一句话概括"
            className="bg-surface2 t1 w-full rounded-[14px] px-3 py-2.5 text-[15px] font-semibold outline-none"
          />
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={minToHM(startMin)}
              onChange={(e) => e.target.value && setTime('start', e.target.value)}
              className="bg-surface2 t1 tnum flex-1 rounded-[14px] px-3 py-2 text-sm outline-none"
            />
            <span className="t3">→</span>
            <input
              type="time"
              value={minToHM(endMin)}
              onChange={(e) => e.target.value && setTime('end', e.target.value)}
              className="bg-surface2 t1 tnum flex-1 rounded-[14px] px-3 py-2 text-sm outline-none"
            />
          </div>
          <MoodRow value={live.mood} onChange={(v) => patch({ mood: v })} />
          <textarea
            value={live.detail ?? ''}
            onChange={(e) => patch({ detail: e.target.value })}
            placeholder="详细记录…"
            rows={3}
            className="bg-surface t1 w-full resize-none rounded-[14px] px-3 py-2.5 text-sm outline-none"
          />
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => patch({ isHighlight: !live.isHighlight })}
                className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${live.isHighlight ? 'bg-primary-soft text-primary' : 'glass t2'}`}
              >
                ⭐ 高光
              </button>
              <button
                type="button"
                onClick={() => patch({ isPrivate: !live.isPrivate })}
                className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${live.isPrivate ? 'bg-primary-soft text-primary' : 'glass t2'}`}
                title="敏感胶囊不参与 AI 复盘"
              >
                🔒 敏感
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                store.deleteCapsule(live.id)
                onClose()
              }}
              className="press t3 rounded-full px-3 py-1.5 text-xs"
            >
              {confirmDelete ? '再点一次确认删除' : '删除'}
            </button>
          </div>
          {live.isPrivate && <p className="t3 text-[11px]">🔒 已标记敏感：这颗胶囊的内容永不发送给 AI，只参与本地时长统计。</p>}
        </div>
      </div>
    </>
  )
}
