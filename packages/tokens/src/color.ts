/** 颜色工具：解析、合成、对比度（WCAG 2.x）。供 tokens 校验与运行时使用。 */

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/** 支持 #rgb / #rrggbb / rgba(r,g,b,a) / rgb(r,g,b) */
export function parseColor(input: string): RGBA {
  const s = input.trim()
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    if (hex.length === 3) {
      const [r, g, b] = hex.split('').map((c) => parseInt(c + c, 16))
      return { r: r!, g: g!, b: b!, a: 1 }
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      }
    }
    throw new Error(`无法解析颜色: ${input}`)
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/)
  if (m) {
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) }
  }
  throw new Error(`无法解析颜色: ${input}`)
}

/** 前景（可含透明度）叠加在不透明背景上的合成色 */
export function compositeOver(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a)
  const mix = (f: number, b: number) => (f * fg.a + b * bg.a * (1 - fg.a)) / (a || 1)
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a }
}

function channelLuminance(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(c: RGBA): number {
  return 0.2126 * channelLuminance(c.r) + 0.7152 * channelLuminance(c.g) + 0.0722 * channelLuminance(c.b)
}

/**
 * WCAG 对比度。fg/bg 可为字符串或 RGBA；若 fg 带透明度会先合成到 bg 上。
 * bg 若也带透明度，需调用方先用 compositeOver 铺到最终底色（见 tokens 校验用法）。
 */
export function contrastRatio(fg: string | RGBA, bg: string | RGBA): number {
  const bgc = typeof bg === 'string' ? parseColor(bg) : bg
  let fgc = typeof fg === 'string' ? parseColor(fg) : fg
  if (fgc.a < 1) fgc = compositeOver(fgc, bgc)
  const l1 = relativeLuminance(fgc)
  const l2 = relativeLuminance(bgc)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** 与白色混合提亮（amount 0–1）。深色模式标签色提亮用。 */
export function lighten(hex: string, amount: number): string {
  const c = parseColor(hex)
  const t = (v: number) => Math.round(v + (255 - v) * amount)
  const to2 = (v: number) => t(v).toString(16).padStart(2, '0')
  return `#${to2(c.r)}${to2(c.g)}${to2(c.b)}`
}

/** 将不透明颜色转为 React Native/Web 都可消费的 rgba。 */
export function withAlpha(color: string, alpha: number): string {
  const c = parseColor(color)
  const bounded = Math.max(0, Math.min(1, alpha))
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${bounded})`
}
