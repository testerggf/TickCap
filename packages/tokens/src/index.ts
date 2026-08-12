/**
 * @tickcap/tokens —— 设计令牌唯一来源。
 * 权威定义：docs/06-UI设计规范.md §10–§17（双主题）。
 * 改视觉先改这里，禁止在组件里硬编码字面量。
 */

export * from './color'
export * from './theme'
import { lighten } from './color'
import {
  resolveTheme,
  type ThemeMode,
  type VisualThemeName,
} from './theme'

/** 系统预置标签（06 §3.3 多巴胺档 12 色）。dark 变体 = 提亮 10%。 */
export interface TagToken {
  key: string
  /** API/SQLite 共用的稳定实体 ID；Web M1 的 preset:key 兼容 ID 暂不改写。 */
  entityId: string
  name: string
  emoji: string
  color: string
  colorDark: string
}

const tag = (
  key: string,
  entityId: string,
  name: string,
  emoji: string,
  color: string,
): TagToken => ({
  key,
  entityId,
  name,
  emoji,
  color,
  colorDark: lighten(color, 0.1),
})

export const presetTags: TagToken[] = [
  tag('work', '02f9471f-7fde-4fa3-9959-66a03ff2df03', '工作', '💼', '#3D74FF'),
  tag('study', 'aae79f03-4751-42fe-b461-5b98ed6fc417', '学习', '📖', '#8F52FF'),
  tag('exercise', 'e5e38d19-c543-4dcc-87a1-f010bd4494e7', '运动', '🏃', '#17CE55'),
  tag('meal', 'e4b93cc1-df87-4ac1-ba9a-0cd9506d34a6', '吃饭', '🍜', '#FFA200'),
  tag('commute', '92fd9a5b-2472-4486-96ca-aee40533fa06', '通勤', '🚇', '#00A8F0'),
  tag('sleep', 'be45a9d4-af8f-4362-a93e-130db459c117', '睡眠', '😴', '#5A5FFF'),
  tag('social', '0553ef56-efc9-4b20-a9a0-efe85235ebee', '社交', '🗣', '#FF4D4D'),
  tag('rest', 'e01c8bcd-05fe-4c79-b8a9-e865a188df71', '休息', '🧘', '#00D4B0'),
  tag('slack', '143808c9-58e0-462f-8f52-bfaf63c1bf7b', '摸鱼', '🌫', '#8FA3BD'),
  tag('muse', '32867612-8ca4-43b7-9972-9f981a40cdbf', '发呆/思考', '💭', '#A886FF'),
  tag('chores', '7406754d-c665-4ff4-b5e0-2744c662452d', '生活杂务', '🛁', '#D08A2E'),
  tag('play', '949a9232-0a5a-49ea-a021-fb38cf136a98', '娱乐', '🎮', '#C13BFF'),
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

export const themeTypography = {
  chronoAmber: {
    displayWeight: 700,
    titleWeight: 700,
    capsuleTitleWeight: 600,
    microWeight: 500,
  },
  jellyGlass: {
    displayFamily: 'Songti SC',
    displayTracking: 0.5,
    displayWeight: 800,
    titleWeight: 700,
    capsuleTitleWeight: 700,
    microWeight: 600,
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

export const timelineLayout = {
  screenPadding: 20,
  timeColumn: 48,
  timeToRailGap: 8,
  railColumn: 16,
  railToCapsuleGap: 10,
  overlapIndent: 12,
  nodeSize: 10,
  nowNodeSize: 8,
  tickIslandSide: 16,
  tickIslandToTab: 8,
  tickIslandMinHeight: 112,
} as const

export const jellyTabLayout = {
  side: 8,
  bottom: 8,
  height: 72,
  radius: 36,
  islandRadius: 38,
  islandGap: 8,
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

export const jellyCapsuleHeight = {
  min: 72,
  max: 152,
  base: 68,
  perMinute: 0.85,
} as const

export const chronoCapsuleHeight = {
  min: 56,
  max: 144,
  base: 44,
  perMinute: 0.42,
} as const

export function capsuleHeightFor(
  minutes: number,
  visualTheme: VisualThemeName,
): number {
  if (visualTheme === 'chronoAmber') {
    return Math.max(
      chronoCapsuleHeight.min,
      Math.min(
        chronoCapsuleHeight.max,
        chronoCapsuleHeight.base + minutes * chronoCapsuleHeight.perMinute,
      ),
    )
  }
  return Math.max(
    jellyCapsuleHeight.min,
    Math.min(
      jellyCapsuleHeight.max,
      jellyCapsuleHeight.base + minutes * jellyCapsuleHeight.perMinute,
    ),
  )
}

export const jellyGlassMaterials = {
  light: {
    highlight: 'rgba(255,255,255,.82)',
    highlightSoft: 'rgba(255,255,255,.10)',
    innerEdge: 'rgba(255,255,255,.72)',
    lowlight: 'rgba(117,91,112,.08)',
    input: 'rgba(255,255,255,.10)',
    tab: 'rgba(255,255,255,.06)',
    nativeTintAlpha: 0.18,
    sheenOpacity: 0.42,
    highlightOpacity: 0.72,
    blobRotation: '-5deg',
    fallbackIntensity: 78,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    edgeWidth: 1.5,
    highlightHeight: 3,
  },
  dark: {
    highlight: 'rgba(255,255,255,.28)',
    highlightSoft: 'rgba(255,255,255,.10)',
    innerEdge: 'rgba(255,255,255,.20)',
    lowlight: 'rgba(0,0,0,.16)',
    input: 'rgba(38,31,47,.52)',
    tab: 'rgba(38,31,47,.42)',
    nativeTintAlpha: 0.22,
    sheenOpacity: 0.28,
    highlightOpacity: 0.4,
    blobRotation: '-5deg',
    fallbackIntensity: 70,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    edgeWidth: 1,
    highlightHeight: 2,
  },
} as const

export const jellyBackgroundLayout = {
  glowSize: 360,
  glowScaleX: 1.55,
  topTintAlpha: 0.02,
  bottomTintAlpha: 0.1,
  blurIntensity: 48,
  waveWidth: 520,
  waveHeight: 176,
  waveBorderWidth: 28,
  waveOpacity: 0.18,
  waveRotation: '-9deg',
  waveBottom: 80,
} as const

export const auroraLayout = {
  glowSize: 256,
  glowScaleX: 1.45,
  secondaryOpacityFactor: 0.7,
} as const

const jellyTagColors: Record<string, Record<ThemeMode, string>> = {
  work: { light: '#FF8A70', dark: '#FF9B83' },
  study: { light: '#9674FF', dark: '#AA8CFF' },
  exercise: { light: '#39BC72', dark: '#55D58A' },
  meal: { light: '#F2A34C', dark: '#FFB765' },
  commute: { light: '#3CA9D8', dark: '#58BDE8' },
  sleep: { light: '#7778E8', dark: '#9293FF' },
  social: { light: '#EB6D75', dark: '#FF848C' },
  rest: { light: '#369BCB', dark: '#55B4DF' },
  slack: { light: '#99A3B2', dark: '#B2BDCA' },
  muse: { light: '#AA84E8', dark: '#BE9CFA' },
  chores: { light: '#C99655', dark: '#DCAA6C' },
  play: { light: '#B764E8', dark: '#CB7BFA' },
}

export function visualTagColor(
  tagId: string | undefined,
  fallback: string,
  visualTheme: VisualThemeName,
  mode: ThemeMode,
): string {
  if (visualTheme !== 'jellyGlass' || !tagId) return fallback
  const preset = presetTags.find((candidate) => candidate.entityId === tagId)
  return preset ? jellyTagColors[preset.key]?.[mode] ?? fallback : fallback
}

/** 输出 CSS 变量（--tc-* 前缀），web 端构建时注入 */
export function toCssVariables(
  mode: ThemeMode,
  visualTheme: VisualThemeName = 'jellyGlass',
): Record<string, string> {
  const t = resolveTheme(visualTheme, mode)
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
    '--tc-action-start': t.actionStart,
    '--tc-action-end': t.actionEnd,
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

export function toCssText(
  mode: ThemeMode,
  visualTheme: VisualThemeName = 'jellyGlass',
): string {
  return Object.entries(toCssVariables(mode, visualTheme))
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n')
}

export * from './native'
