const FORBIDDEN_EVENT_PROP_KEYS = new Set([
  'summary',
  'detail',
  'content',
  'content_md',
  'edited_md',
  'note',
  'text',
])

export function assertEventPropsExcludeContent(
  props: Readonly<Record<string, unknown>>,
): void {
  for (const key of Object.keys(props)) {
    if (FORBIDDEN_EVENT_PROP_KEYS.has(key.toLowerCase())) {
      throw new Error(`埋点属性 ${key} 禁止包含用户正文`)
    }
  }
}
