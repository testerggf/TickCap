/**
 * @tickcap/tokens —— 设计令牌唯一来源。
 * 权威定义：docs/06-UI设计规范.md §3（果冻胶囊 Jelly Glass）。
 * 改视觉先改这里，禁止在组件里硬编码字面量。
 */

export * from './color'
import { lighten } from './color'

export type ThemeMode = 'light' | 'dark'

export interface Theme {
  bg: string
  surface: string
  surface2: string
  border: string
  text1: string
  text2: string
  text3: string
  primary: string
  primarySoft: string
  /** 渐变行动色：只用于 FAB、封存按钮、选中 chip（06 §3.1 规则） */
  gradientAction: string
  /** 果冻玻璃配方（06 §3.4） */
  glassBg: string
  glassBorder: string
  glassBlur: number // px
  glassSaturate: number // %
  /** 极光层（06 §3.2，静态、限定页面使用） */
  aurora: string
}

export const themes: Record<ThemeMode, Theme> = {
  light: {
    bg: '#FCF2FA',
    surface: '#FFFFFF',
    surface2: 'rgba(255,255,255,.60)',
    border: 'rgba(200,140,190,.30)',
    text1: '#26121F',
    text2: '#7A5570',
    text3: '#B58BA8',
    primary: '#FF4FA0',
    primarySoft: 'rgba(255,79,160,.13)',
    gradientAction: 'linear-gradient(135deg, #FF4FA0, #FF8E3C)',
    glassBg: 'rgba(255,255,255,.55)',
    glassBorder: 'rgba(255,255,255,.75)',
    glassBlur: 16,
    glassSaturate: 200,
    aurora: [
      'radial-gradient(circle at 12% 10%, rgba(255,84,163,.22), transparent 45%)',
      'radial-gradient(circle at 92% 20%, rgba(255,180,60,.22), transparent 45%)',
      'radial-gradient(circle at 20% 95%, rgba(90,200,250,.22), transparent 50%)',
      'radial-gradient(circle at 85% 90%, rgba(150,120,255,.18), transparent 45%)',
    ].join(', '),
  },
  dark: {
    bg: '#150F20',
    surface: '#221A33',
    surface2: 'rgba(60,45,85,.50)',
    border: 'rgba(200,150,220,.20)',
    text1: '#FBF3FA',
    text2: '#C2A8C4',
    text3: '#7E6690',
    primary: '#FF6BB0',
    primarySoft: 'rgba(255,107,176,.16)',
    gradientAction: 'linear-gradient(135deg, #FF4FA0, #FF8E3C)',
    glassBg: 'rgba(45,32,70,.50)',
    glassBorder: 'rgba(255,255,255,.14)',
    glassBlur: 16,
    glassSaturate: 200,
    aurora: [
      'radial-gradient(circle at 12% 10%, rgba(255,84,163,.28), transparent 45%)',
      'radial-gradient(circle at 92% 20%, rgba(255,160,60,.20), transparent 45%)',
      'radial-gradient(circle at 25% 95%, rgba(90,160,255,.22), transparent 50%)',
    ].join(', '),
  },
}

/** 系统预置标签（06 §3.3 多巴胺档 12 色）。dark 变体 = 提亮 10%。 */
export interface TagToken {
  key: string
  name: string
  emoji: string
  color: string
  colorDark: string
}

const tag = (key: string, name: string, emoji: string, color: string): TagToken => ({
  key,
  name,
  emoji,
  color,
  colorDark: lighten(color, 0.1),
})

export const presetTags: TagToken[] = [
  tag('work', '工作', '💼', '#3D74FF'),
  tag('study', '学习', '📖', '#8F52FF'),
  tag('exercise', '运动', '🏃', '#17CE55'),
  tag('meal', '吃饭', '🍜', '#FFA200'),
  tag('commute', '通勤', '🚇', '#00A8F0'),
  tag('sleep', '睡眠', '😴', '#5A5FFF'),
  tag('social', '社交', '🗣', '#FF4D4D'),
  tag('rest', '休息', '🧘', '#00D4B0'),
  tag('slack', '摸鱼', '🌫', '#8FA3BD'),
  tag('muse', '发呆/思考', '💭', '#A886FF'),
  tag('chores', '生活杂务', '🛁', '#D08A2E'),
  tag('play', '娱乐', '🎮', '#C13BFF'),
]

/** 字体（06 §3.5） */
export const typography = {
  fontFamily:
    '-apple-system, "PingFang SC", "HarmonyOS Sans", "MiSans", sans-serif',
  scale: {
    display: { size: 28, lineHeight: 36, weight: 800 },
    title: { size: 20, lineHeight: 28, weight: 700 },
    bodyLg: { size: 17, lineHeight: 26, weight: 400 },
    body: { size: 15, lineHeight: 22, weight: 400 },
    caption: { size: 13, lineHeight: 18, weight: 400 },
    micro: { size: 11, lineHeight: 14, weight: 600 },
  },
} as const

/** 间距（4pt 网格）与圆角（06 §3.6） */
export const spacing = [4, 8, 12, 16, 20, 24, 32] as const
export const radius = {
  capsule: 20,
  island: 24,
  sheet: 28,
  input: 14,
  pill: 9999,
} as const

/** 动效（06 §3.7），时长 ms */
export const motion = {
  fast: { duration: 150, easing: 'ease-out' },
  press: { duration: 120, easing: 'spring' },
  base: { duration: 250, easing: 'ease-out' },
  slow: { duration: 450, easing: 'spring' },
} as const

/** 布局断点（06 §5） */
export const breakpoints = { tablet: 768, desktop: 1024 } as const

/** 时间轴胶囊高度映射（06 §4.1） */
export const capsuleHeight = { min: 44, max: 120 } as const

/** 输出 CSS 变量（--tc-* 前缀），web 端构建时注入 */
export function toCssVariables(mode: ThemeMode): Record<string, string> {
  const t = themes[mode]
  const vars: Record<string, string> = {
    '--tc-bg': t.bg,
    '--tc-surface': t.surface,
    '--tc-surface-2': t.surface2,
    '--tc-border': t.border,
    '--tc-text-1': t.text1,
    '--tc-text-2': t.text2,
    '--tc-text-3': t.text3,
    '--tc-primary': t.primary,
    '--tc-primary-soft': t.primarySoft,
    '--tc-gradient-action': t.gradientAction,
    '--tc-glass-bg': t.glassBg,
    '--tc-glass-border': t.glassBorder,
    '--tc-glass-blur': `${t.glassBlur}px`,
    '--tc-glass-saturate': `${t.glassSaturate}%`,
    '--tc-aurora': t.aurora,
  }
  for (const tg of presetTags) {
    vars[`--tc-tag-${tg.key}`] = mode === 'dark' ? tg.colorDark : tg.color
  }
  return vars
}

export function toCssText(mode: ThemeMode): string {
  return Object.entries(toCssVariables(mode))
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n')
}
