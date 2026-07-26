'use client'
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { useStore } from '@/lib/store'
import { presetTags } from '@tickcap/tokens'
import { minToHM } from '@/lib/format'

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsInner />
    </AppShell>
  )
}

function SettingsInner() {
  const store = useStore()
  const s = store.settings
  const [tagName, setTagName] = useState('')
  const [tagEmoji, setTagEmoji] = useState('✨')
  const [tagColor, setTagColor] = useState(presetTags[0]!.color)

  const hmToMin = (hm: string) => {
    const [h, m] = hm.split(':').map(Number)
    return h! * 60 + m!
  }

  const exportData = (kind: 'json' | 'md') => {
    let content: string
    let filename: string
    if (kind === 'json') {
      content = JSON.stringify(
        { capsules: store.capsules, seals: store.seals, reports: store.reports, customTags: store.customTags, settings: s },
        null,
        2,
      )
      filename = 'tickcap-export.json'
    } else {
      const dates = [...new Set(store.capsules.map((c) => c.date))].sort()
      const lines: string[] = ['# TickCap 导出', '']
      for (const d of dates) {
        lines.push(`## ${d}`, '')
        for (const c of store.capsulesOf(d)) {
          lines.push(`- ${c.startAt.slice(11, 16)}~${c.endAt.slice(11, 16)}(UTC) ${c.summary ?? ''} ${c.detail ? `｜${c.detail}` : ''}`)
        }
        const r = store.reports[d]
        if (r) lines.push('', '### 复盘', r.contentMd)
        lines.push('')
      }
      content = lines.join('\n')
      filename = 'tickcap-export.md'
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const addTag = () => {
    if (!tagName.trim() || store.customTags.length >= 5) return
    store.addCustomTag({ name: tagName.trim(), emoji: tagEmoji, color: tagColor })
    setTagName('')
  }

  return (
    <div className="min-h-dvh px-4 pb-24 pt-6">
      <h1 className="t1 px-1 pb-4 text-xl font-extrabold">我的</h1>

      <div className="space-y-4">
        <section className="bg-surface rounded-[20px] p-4">
          <h2 className="t1 pb-3 text-sm font-bold">时间设置</h2>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between">
              <span className="t2">
                日界 <span className="t3 text-[10px]">（此前的凌晨记录归昨天）</span>
              </span>
              <input
                type="time"
                value={minToHM(s.dayBoundaryMin)}
                onChange={(e) => e.target.value && store.updateSettings({ dayBoundaryMin: hmToMin(e.target.value) })}
                className="bg-surface2 t1 tnum rounded-[10px] px-2 py-1"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="t2">默认起床时间</span>
              <input
                type="time"
                value={minToHM(s.wakeDefaultMin)}
                onChange={(e) => e.target.value && store.updateSettings({ wakeDefaultMin: hmToMin(e.target.value) })}
                className="bg-surface2 t1 tnum rounded-[10px] px-2 py-1"
              />
            </label>
            <p className="t3 text-[10px]">时区：{s.timezone}（自动检测）· 修改日界不影响历史记录</p>
          </div>
        </section>

        <section className="bg-surface rounded-[20px] p-4">
          <h2 className="t1 pb-3 text-sm font-bold">
            自定义标签 <span className="t3 font-normal">（{store.customTags.length}/5）</span>
          </h2>
          {store.customTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-3">
              {store.customTags.map((t) => (
                <span key={t.id} className="glass rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: t.color }}>
                  {t.emoji} {t.name}
                </span>
              ))}
            </div>
          )}
          {store.customTags.length < 5 && (
            <div className="flex items-center gap-2">
              <input
                value={tagEmoji}
                onChange={(e) => setTagEmoji(e.target.value.slice(0, 2))}
                className="bg-surface2 w-11 rounded-[10px] px-2 py-2 text-center text-sm"
                aria-label="emoji"
              />
              <input
                value={tagName}
                onChange={(e) => setTagName(e.target.value.slice(0, 6))}
                placeholder="标签名"
                className="bg-surface2 t1 flex-1 rounded-[10px] px-3 py-2 text-sm outline-none"
              />
              <select
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="bg-surface2 t1 rounded-[10px] px-1 py-2 text-xs"
                style={{ color: tagColor }}
                aria-label="颜色"
              >
                {presetTags.map((p) => (
                  <option key={p.key} value={p.color} style={{ color: p.color }}>
                    ● {p.name}色
                  </option>
                ))}
              </select>
              <button type="button" onClick={addTag} className="grad-action press rounded-full px-3 py-2 text-xs font-bold">
                添加
              </button>
            </div>
          )}
        </section>

        <section className="bg-surface rounded-[20px] p-4">
          <h2 className="t1 pb-3 text-sm font-bold">数据</h2>
          <p className="t3 pb-3 text-[11px]">
            {store.capsules.length} 颗胶囊 · 封存 {Object.keys(store.seals).length} 天 · 数据存储在本设备（本地优先），导出永久免费
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => exportData('md')} className="glass press t1 flex-1 rounded-full py-2 text-xs font-semibold">
              导出 Markdown
            </button>
            <button type="button" onClick={() => exportData('json')} className="glass press t1 flex-1 rounded-full py-2 text-xs font-semibold">
              导出 JSON
            </button>
          </div>
        </section>

        <section className="bg-surface rounded-[20px] p-4">
          <h2 className="t1 pb-2 text-sm font-bold">AI 复盘</h2>
          <p className="t2 text-xs leading-relaxed">
            服务端配置 <code className="t1">DEEPSEEK_API_KEY</code> 后封存时自动使用 AI 生成复盘；未配置时使用本地模板生成。🔒 标记敏感的胶囊内容永不发送给
            AI。
          </p>
        </section>

        <p className="t3 pb-4 text-center text-[10px]">TickCap M1 · 本地模式 · 账号与云同步在下一里程碑</p>
      </div>
    </div>
  )
}
