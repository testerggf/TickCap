/**
 * 令牌校验测试 —— docs/06 §3.4 / §8 的红线在这里被机器执行：
 * 任何改色导致可读性破线，CI 直接红。
 */
import { describe, expect, it } from 'vitest'
import {
  compositeOver,
  contrastRatio,
  lighten,
  parseColor,
  presetTags,
  themes,
  toCssVariables,
  type ThemeMode,
} from '../src'

const MODES: ThemeMode[] = ['light', 'dark']

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
  for (const mode of MODES) {
    const t = themes[mode]

    it(`[${mode}] text-1 在 surface 上 ≥ 4.5`, () => {
      expect(contrastRatio(t.text1, t.surface)).toBeGreaterThanOrEqual(4.5)
    })

    it(`[${mode}] text-1 在 bg 上 ≥ 4.5`, () => {
      expect(contrastRatio(t.text1, t.bg)).toBeGreaterThanOrEqual(4.5)
    })

    it(`[${mode}] text-2 在 surface 上 ≥ 4.5`, () => {
      expect(contrastRatio(t.text2, t.surface)).toBeGreaterThanOrEqual(4.5)
    })

    it(`[${mode}] text-1 在「玻璃叠加到 bg」的合成色上 ≥ 4.5（玻璃卡片可读性）`, () => {
      const glassOnBg = compositeOver(parseColor(t.glassBg), parseColor(t.bg))
      expect(contrastRatio(t.text1, glassOnBg)).toBeGreaterThanOrEqual(4.5)
    })

    it(`[${mode}] 玻璃底不透明度达标（light ≥ .55 / dark ≥ .50）`, () => {
      const min = mode === 'light' ? 0.55 : 0.5
      expect(parseColor(t.glassBg).a).toBeGreaterThanOrEqual(min)
    })
  }
})

describe('标签色板（06 §3.3）', () => {
  it('恰好 12 个预置标签，key 与颜色均唯一', () => {
    expect(presetTags).toHaveLength(12)
    expect(new Set(presetTags.map((t) => t.key)).size).toBe(12)
    expect(new Set(presetTags.map((t) => t.color)).size).toBe(12)
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
