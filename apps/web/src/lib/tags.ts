import { presetTags, type TagToken } from '@tickcap/tokens'

export interface TagInfo {
  id: string
  name: string
  emoji: string
  color: string
}

export interface CustomTag extends TagInfo {
  custom: true
}

/** 预置标签 id 形如 preset:work（与未来服务端 tags 表并存不冲突） */
export const PRESET_TAGS: TagInfo[] = presetTags.map((t: TagToken) => ({
  id: `preset:${t.key}`,
  name: t.name,
  emoji: t.emoji,
  color: t.color,
}))

/** 起床/睡觉是高频锚点标签（02 §2.2），用吃饭色/睡眠色的近似轴心 */
export const ANCHOR_TAGS: TagInfo[] = [
  { id: 'preset:wake', name: '起床', emoji: '☀️', color: '#FFA200' },
  { id: 'preset:bed', name: '睡觉', emoji: '🌙', color: '#5A5FFF' },
]

export const ALL_PRESET_TAGS: TagInfo[] = [...ANCHOR_TAGS, ...PRESET_TAGS]

export function resolveTag(id: string, customTags: CustomTag[]): TagInfo {
  return (
    ALL_PRESET_TAGS.find((t) => t.id === id) ??
    customTags.find((t) => t.id === id) ?? { id, name: '记录', emoji: '📌', color: '#8FA3BD' }
  )
}
