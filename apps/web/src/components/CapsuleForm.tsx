'use client'
/** 胶囊表单共用件：标签网格、心情、时间、详情。滴答栏展开态 / 编辑弹层 / 补记共用。 */
import { ALL_PRESET_TAGS, type CustomTag, type TagInfo } from '@/lib/tags'
import type { CapsuleRec } from '@/lib/store'

export const MOODS: { v: 1 | 2 | 3 | 4 | 5; e: string }[] = [
  { v: 1, e: '😫' },
  { v: 2, e: '😕' },
  { v: 3, e: '😐' },
  { v: 4, e: '🙂' },
  { v: 5, e: '🤩' },
]

export function TagGrid({
  customTags,
  selected,
  onToggle,
}: {
  customTags: CustomTag[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const all: TagInfo[] = [...ALL_PRESET_TAGS, ...customTags]
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((t) => {
        const on = selected.includes(t.id)
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            className={`press rounded-full px-2.5 py-1.5 text-xs font-semibold ${on ? 'grad-action' : 'glass t2'}`}
          >
            {t.emoji} {t.name}
          </button>
        )
      })}
    </div>
  )
}

export function MoodRow({
  value,
  onChange,
}: {
  value?: CapsuleRec['mood']
  onChange: (v: CapsuleRec['mood'] | undefined) => void
}) {
  return (
    <div className="flex gap-2">
      {MOODS.map((m) => (
        <button
          key={m.v}
          type="button"
          onClick={() => onChange(value === m.v ? undefined : m.v)}
          className={`press flex h-9 w-9 items-center justify-center rounded-full text-lg ${
            value === m.v ? 'bg-primary-soft ring-2' : 'glass'
          }`}
          style={value === m.v ? { ['--tw-ring-color' as string]: 'var(--tc-primary)' } : undefined}
        >
          {m.e}
        </button>
      ))}
    </div>
  )
}
