/**
 * 复盘生成：优先服务端 AI（/api/review，需配置 key），失败/无 key 走本地降级版。
 * 规格：docs/08 §2（数据打包+隐私过滤）、§5（失败兜底铁律：封存不依赖 AI）。
 */
import {
  buildDailyContext as buildCoreDailyContext,
  buildLocalDailyReview,
  type DailyContext,
} from '@tickcap/core'
import { resolveTag, type CustomTag } from './tags'
import type { CapsuleRec } from './store'

export type DayContext = DailyContext

/** 数据打包 + 隐私过滤（08 §2：is_private 只留时长，内容物理剔除） */
export function buildDayContext(
  date: string,
  capsules: CapsuleRec[],
  customTags: CustomTag[],
  timezone: string,
  streak: number,
): DayContext {
  return buildCoreDailyContext({
    date,
    timezone,
    streak,
    capsules: capsules.map((capsule) => ({
      startAt: new Date(capsule.startAt),
      endAt: new Date(capsule.endAt),
      tags: capsule.tagIds.map((id) => resolveTag(id, customTags).name),
      summary: capsule.summary,
      detail: capsule.detail,
      mood: capsule.mood,
      isHighlight: capsule.isHighlight,
      isPrivate: capsule.isPrivate,
    })),
  })
}

/** 本地降级版复盘（08 §5：AI 失败时的规则渲染版） */
export function localReview(ctx: DayContext): string {
  return buildLocalDailyReview(ctx)
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
