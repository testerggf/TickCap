import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../src'

const OP_ID = '019fae57-cb8b-7470-b1c3-ef7fe9452e35'
const ENTITY_ID = '019fae58-1dd2-7a51-a8e0-5f21268f3f9e'

describe('API client', () => {
  it('push 校验输入、附带 token，并校验响应', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              op_id: OP_ID,
              status: 'accepted',
              entity: { id: ENTITY_ID },
            },
          ],
          server_time: '2026-07-29T15:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const client = createApiClient({
      baseUrl: 'https://api.tickcap.test/',
      fetch: fetchMock,
      getAccessToken: () => 'test-token',
    })

    await client.push({
      device_id: 'ios-device',
      operations: [
        {
          op_id: OP_ID,
          entity_type: 'capsule',
          entity_id: ENTITY_ID,
          action: 'upsert',
          client_updated_at: '2026-07-29T14:59:00.000Z',
          changed_fields: ['summary'],
          payload: { summary: '完成 API client' },
        },
      ],
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.tickcap.test/sync/push')
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer test-token',
    )
  })

  it('pull 对 cursor 做 URL 编码并限制单批数量', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          changes: [],
          next_cursor: 'next',
          has_more: false,
          server_time: '2026-07-29T15:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const client = createApiClient({
      baseUrl: 'https://api.tickcap.test',
      fetch: fetchMock,
    })

    await client.pull('opaque:+/=', 100)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.tickcap.test/sync/pull?limit=100&cursor=opaque%3A%2B%2F%3D',
    )
    await expect(client.pull(undefined, 501)).rejects.toThrow(RangeError)
  })

  it('非 2xx 响应保留状态码与错误体', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const client = createApiClient({
      baseUrl: 'https://api.tickcap.test',
      fetch: fetchMock,
    })

    await expect(client.pull()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      body: { code: 'UNAUTHORIZED' },
    })
  })
})
