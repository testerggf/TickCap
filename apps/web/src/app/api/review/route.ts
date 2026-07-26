import { NextResponse } from 'next/server'
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts/daily-v1'

/**
 * AI 复盘代理（08 §4/§5）：服务端持有 key，前端永不直连大模型。
 * 未配置 DEEPSEEK_API_KEY 时返回 501，前端走本地降级版（铁律：封存不依赖 AI）。
 */
export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'NO_KEY' }, { status: 501 })
  }

  let context: unknown
  try {
    const body = (await req.json()) as { context?: unknown }
    context = body.context
    if (!context) throw new Error('missing context')
  } catch {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(JSON.stringify(context)) },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'UPSTREAM_FAILED' }, { status: 502 })
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return NextResponse.json({ error: 'EMPTY' }, { status: 502 })
    return NextResponse.json({ content, promptVersion: PROMPT_VERSION })
  } catch {
    return NextResponse.json({ error: 'UPSTREAM_FAILED' }, { status: 502 })
  }
}
