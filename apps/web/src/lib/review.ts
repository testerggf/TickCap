/**
 * 复盘生成：优先服务端 AI（/api/review，需配置 key），失败/无 key 走本地降级版。
 * 规格：docs/08 §2（数据打包+隐私过滤）、§5（失败兜底铁律：封存不依赖 AI）。
 */
import { spanMinutes, fmtHM, fmtDuration } from './format'
import { resolveTag, type CustomTag } from './tags'
import type { CapsuleRec } from './store'

export interface DayContext {
  date: string
  capsuleCount: number
  recordedMinutes: number
  byTag: { tag: string; minutes: number; pct: number }[]
  capsules: {
    t: string
    tags: string[]
    summary?: string
    detail?: string
    mood?: number
    highlight?: boolean
    private?: boolean
  }[]
  streak: number
}

/** 数据打包 + 隐私过滤（08 §2：is_private 只留时长，内容物理剔除） */
export function buildDayContext(
  date: string,
  capsules: CapsuleRec[],
  customTags: CustomTag[],
  timezone: string,
  streak: number,
): DayContext {
  const byTagMin: Record<string, number> = {}
  let total = 0
  for (const c of capsules) {
    const min = spanMinutes(c.startAt, c.endAt)
    total += min
    const name = resolveTag(c.tagIds[0] ?? '', customTags).name
    byTagMin[name] = (byTagMin[name] ?? 0) + min
  }
  const byTag = Object.entries(byTagMin)
    .map(([tag, minutes]) => ({ tag, minutes, pct: total ? Math.round((minutes / total) * 100) : 0 }))
    .sort((a, b) => b.minutes - a.minutes)

  return {
    date,
    capsuleCount: capsules.length,
    recordedMinutes: total,
    byTag,
    capsules: capsules.map((c) => {
      const base = {
        t: `${fmtHM(c.startAt, timezone)}-${fmtHM(c.endAt, timezone)}`,
        tags: c.tagIds.map((id) => resolveTag(id, customTags).name),
      }
      if (c.isPrivate) return { ...base, private: true }
      return {
        ...base,
        summary: c.summary,
        detail: c.detail,
        mood: c.mood,
        highlight: c.isHighlight || undefined,
      }
    }),
    streak,
  }
}

const QUESTIONS: Record<string, string[]> = {
  工作: ['今天推进最顺的那件事，顺在哪里？明天能复制吗？', '如果明天只能做一件工作上的事，你会选哪件？'],
  学习: ['今天学到的东西里，哪一点是你一周后还想记得的？'],
  运动: ['身体今天给了你什么反馈？'],
  摸鱼: ['摸鱼的时候，你在回避的是哪件事？（不用批评自己，看见就好）'],
  default: ['今天有没有哪个瞬间，你希望时间过得慢一点？', '如果给今天起一个标题，会是什么？'],
}

/** 本地降级版复盘（08 §5：AI 失败时的规则渲染版） */
export function localReview(ctx: DayContext): string {
  const lines: string[] = []
  const top = ctx.byTag[0]

  lines.push('## 一日纵览')
  if (ctx.capsuleCount === 0) {
    lines.push('今天还没有胶囊。')
  } else {
    const hours = Math.round((ctx.recordedMinutes / 60) * 10) / 10
    let overview = `今天记录了 ${ctx.capsuleCount} 颗胶囊，共 ${hours} 小时。`
    if (top) overview += `时间投入最多的是「${top.tag}」（${fmtDuration(top.minutes)}，占 ${top.pct}%）。`
    const moods = ctx.capsules.filter((c) => c.mood).map((c) => c.mood!)
    if (moods.length) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length
      overview += avg >= 4 ? '整体心情不错。' : avg <= 2.5 ? '今天似乎有些疲惫，辛苦了。' : ''
    }
    lines.push(overview)
  }

  lines.push('', '## 时间账单')
  for (const t of ctx.byTag) {
    lines.push(`- ${t.tag}：${fmtDuration(t.minutes)}（${t.pct}%）`)
  }

  const highlights = ctx.capsules.filter((c) => !c.private && (c.highlight || c.detail))
  if (highlights.length) {
    lines.push('', '## 高光时刻')
    for (const h of highlights.slice(0, 3)) {
      const text = h.detail || h.summary || h.tags.join('·')
      lines.push(`- ${h.t}「${text}」`)
    }
  }

  const qs = (top && QUESTIONS[top.tag]) || QUESTIONS['default']!
  lines.push('', '## 明日一问', qs[ctx.capsuleCount % qs.length]!)

  return lines.join('\n')
}

export interface ReviewResult {
  contentMd: string
  generatedBy: 'ai' | 'local'
}

/** 生成复盘：AI 优先、本地兜底（30s 超时） */
export async function generateReview(ctx: DayContext): Promise<ReviewResult> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: ctx }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      const data = (await res.json()) as { content?: string }
      if (data.content) return { contentMd: data.content, generatedBy: 'ai' }
    }
  } catch {
    // 网络失败/超时 → 本地兜底
  }
  return { contentMd: localReview(ctx), generatedBy: 'local' }
}
