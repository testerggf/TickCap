/**
 * 令牌校验测试 —— docs/06 §3.4 / §8 的红线在这里被机器执行：
 * 任何改色导致可读性破线，CI 直接红。
 */
import { describe, expect, it } from 'vitest'
import {
  compositeOver,
  contrastRatio,
  lighten,
  nativeThemes,
  nativeVisualThemes,
  parseColor,
  presetTags,
  themes,
  toCssVariables,
  visualThemes,
  type ThemeMode,
  type VisualThemeName,
} from '../src'

const MODES: ThemeMode[] = ['light', 'dark']
const VISUAL_THEMES: VisualThemeName[] = ['chronoAmber', 'jellyGlass']

describe('色彩工具', () => {
  it('解析 hex 与 rgba', () => {
    expect(parseColor('#FF4FA0')).toEqual({ r: 255, g: 79, b: 160, a: 1 })
    expect(parseColor('rgba(255,255,255,.55)').a).toBeCloseTo(0.55)
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
  })

  it('黑白对比度为 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  })

  it('lighten 提亮方向正确', () => {
    const base = parseColor('#3D74FF')
    const lit = parseColor(lighten('#3D74FF', 0.1))
    expect(lit.r).toBeGreaterThan(base.r)
    expect(lit.g).toBeGreaterThan(base.g)
  })
})

describe('可读性红线（06 §3.4：正文对比度 ≥ 4.5:1）', () => {
  for (const visualTheme of VISUAL_THEMES) {
    for (const mode of MODES) {
      const t = visualThemes[visualTheme][mode]

      it(`[${visualTheme}/${mode}] text-1 在 surface 上 ≥ 4.5`, () => {
        expect(contrastRatio(t.text1, t.surface)).toBeGreaterThanOrEqual(4.5)
      })

      it(`[${visualTheme}/${mode}] text-1 在 bg 上 ≥ 4.5`, () => {
        expect(contrastRatio(t.text1, t.bg)).toBeGreaterThanOrEqual(4.5)
      })

      it(`[${visualTheme}/${mode}] text-2 在 surface 上 ≥ 4.5`, () => {
        expect(contrastRatio(t.text2, t.surface)).toBeGreaterThanOrEqual(4.5)
      })

      it(`[${visualTheme}/${mode}] text-1 在玻璃合成色上 ≥ 4.5`, () => {
        const glassOnBg = compositeOver(parseColor(t.glassBg), parseColor(t.bg))
        expect(contrastRatio(t.text1, glassOnBg)).toBeGreaterThanOrEqual(4.5)
      })

      it(`[${visualTheme}/${mode}] 玻璃底不透明度达标`, () => {
        const min = mode === 'light' ? 0.55 : 0.5
        expect(parseColor(t.glassBg).a).toBeGreaterThanOrEqual(min)
      })
    }
  }
})

describe('双主题完整性（06 §10）', () => {
  it('包含时间琥珀与果冻玻璃的深浅四组合', () => {
    for (const visualTheme of VISUAL_THEMES) {
      for (const mode of MODES) {
        const theme = visualThemes[visualTheme][mode]
        expect(theme.visualTheme).toBe(visualTheme)
        expect(theme.mode).toBe(mode)
        expect(theme.actionStart).toMatch(/^#[0-9A-F]{6}$/i)
        expect(theme.actionEnd).toMatch(/^#[0-9A-F]{6}$/i)
        expect(theme.auroraColors).toHaveLength(4)
      }
    }
  })

  it('Web 兼容出口仍为果冻玻璃', () => {
    expect(themes).toBe(visualThemes.jellyGlass)
  })
})

describe('标签色板（06 §3.3）', () => {
  it('恰好 12 个预置标签，key、实体 ID 与颜色均唯一', () => {
    expect(presetTags).toHaveLength(12)
    expect(new Set(presetTags.map((t) => t.key)).size).toBe(12)
    expect(new Set(presetTags.map((t) => t.entityId)).size).toBe(12)
    expect(new Set(presetTags.map((t) => t.color)).size).toBe(12)
    for (const tag of presetTags) {
      expect(tag.entityId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    }
  })

  it('全部为合法 hex，dark 变体更亮', () => {
    for (const tg of presetTags) {
      expect(tg.color).toMatch(/^#[0-9A-F]{6}$/i)
      const base = parseColor(tg.color)
      const dark = parseColor(tg.colorDark)
      expect(dark.r + dark.g + dark.b).toBeGreaterThan(base.r + base.g + base.b)
    }
  })
})

describe('CSS 变量输出', () => {
  it('两种模式都包含全部主题变量与 12 个标签变量', () => {
    for (const mode of MODES) {
      const vars = toCssVariables(mode)
      expect(vars['--tc-bg']).toBeTruthy()
      expect(vars['--tc-gradient-action']).toContain('linear-gradient')
      expect(Object.keys(vars).filter((k) => k.startsWith('--tc-tag-'))).toHaveLength(12)
    }
  })

  it('dark 模式标签变量使用提亮版', () => {
    const vars = toCssVariables('dark')
    const work = presetTags.find((t) => t.key === 'work')!
    expect(vars['--tc-tag-work']).toBe(work.colorDark)
  })
})

describe('React Native 令牌输出', () => {
  it('保留颜色/材质数值并排除 CSS-only 渐变字符串', () => {
    expect(nativeThemes.light.primary).toBe(themes.light.primary)
    expect(nativeThemes.light.glassBlur).toBe(themes.light.glassBlur)
    expect('gradientAction' in nativeThemes.light).toBe(false)
    expect('aurora' in nativeThemes.light).toBe(false)
  })

  it('四种组合都排除 CSS-only 字段', () => {
    for (const visualTheme of VISUAL_THEMES) {
      for (const mode of MODES) {
        const theme = nativeVisualThemes[visualTheme][mode]
        expect(theme.visualTheme).toBe(visualTheme)
        expect('gradientAction' in theme).toBe(false)
        expect('aurora' in theme).toBe(false)
      }
    }
  })
})
