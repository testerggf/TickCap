import type { DailyContext } from './daily-context'

const QUESTIONS: Record<string, string[]> = {
  工作: [
    '今天推进最顺的那件事，顺在哪里？明天能复制吗？',
    '如果明天只能做一件工作上的事，你会选哪件？',
  ],
  学习: ['今天学到的东西里，哪一点是你一周后还想记得的？'],
  运动: ['身体今天给了你什么反馈？'],
  摸鱼: ['摸鱼的时候，你在回避的是哪件事？（不用批评自己，看见就好）'],
  default: [
    '今天有没有哪个瞬间，你希望时间过得慢一点？',
    '如果给今天起一个标题，会是什么？',
  ],
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h${remainder}m`
}

/** docs/08 §5：不依赖网络或模型的规则复盘，封存失败兜底由三端共享。 */
export function buildLocalDailyReview(context: DailyContext): string {
  const lines: string[] = []
  const top = context.day_summary.by_tag[0]

  lines.push('## 一日纵览')
  if (context.day_summary.capsule_count === 0) {
    lines.push('今天还没有胶囊。')
  } else {
    const hours =
      Math.round((context.day_summary.recorded_minutes / 60) * 10) / 10
    let overview = `今天记录了 ${context.day_summary.capsule_count} 颗胶囊，共 ${hours} 小时。`
    if (top) {
      overview += `时间投入最多的是「${top.tag}」（${formatDuration(top.minutes)}，占 ${top.pct}%）。`
    }
    const moods = context.capsules
      .filter((capsule) => capsule.mood)
      .map((capsule) => capsule.mood!)
    if (moods.length) {
      const average = moods.reduce((sum, mood) => sum + mood, 0) / moods.length
      if (average >= 4) overview += '整体心情不错。'
      if (average <= 2.5) overview += '今天似乎有些疲惫，辛苦了。'
    }
    lines.push(overview)
  }

  lines.push('', '## 时间账单')
  for (const tag of context.day_summary.by_tag) {
    lines.push(`- ${tag.tag}：${formatDuration(tag.minutes)}（${tag.pct}%）`)
  }

  const highlights = context.capsules.filter(
    (capsule) => !capsule.private && (capsule.highlight || capsule.detail),
  )
  if (highlights.length) {
    lines.push('', '## 高光时刻')
    for (const highlight of highlights.slice(0, 3)) {
      const text =
        highlight.detail || highlight.summary || highlight.tags.join('·')
      lines.push(`- ${highlight.t}「${text}」`)
    }
  }

  const questions = (top && QUESTIONS[top.tag]) || QUESTIONS.default!
  lines.push(
    '',
    '## 明日一问',
    questions[context.day_summary.capsule_count % questions.length]!,
  )
  return lines.join('\n')
}
