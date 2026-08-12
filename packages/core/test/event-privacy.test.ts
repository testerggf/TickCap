import { describe, expect, it } from 'vitest'
import { assertEventPropsExcludeContent } from '../src'

describe('埋点正文隐私边界', () => {
  it('允许业务统计值', () => {
    expect(() =>
      assertEventPropsExcludeContent({
        source: 'manual',
        tag_count: 2,
        has_summary: true,
      }),
    ).not.toThrow()
  })

  it.each(['summary', 'detail', 'content_md', 'edited_md', 'note', 'text'])(
    '拒绝正文属性 %s',
    (key) => {
      expect(() =>
        assertEventPropsExcludeContent({ [key]: '用户写下的内容' }),
      ).toThrow('禁止包含用户正文')
    },
  )
})
