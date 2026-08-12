import type { z } from 'zod'
import {
  syncPullResponseSchema,
  syncPushRequestSchema,
  syncPushResponseSchema,
  type SyncPullResponse,
  type SyncPushRequest,
  type SyncPushResponse,
} from './sync'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiClientOptions {
  baseUrl: string
  fetch?: typeof globalThis.fetch
  getAccessToken?: () => string | null | Promise<string | null>
}

export interface ApiClient {
  push: (request: SyncPushRequest) => Promise<SyncPushResponse>
  pull: (cursor?: string, limit?: number) => Promise<SyncPullResponse>
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function createApiClient({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
  getAccessToken,
}: ApiClientOptions): ApiClient {
  if (!fetchImpl) throw new Error('当前运行时没有 fetch 实现')
  const root = trimTrailingSlash(baseUrl)

  const request = async <T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
  ): Promise<T> => {
    const token = await getAccessToken?.()
    const headers = new Headers(init?.headers)
    headers.set('Accept', 'application/json')
    if (init?.body) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetchImpl(`${root}${path}`, { ...init, headers })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      throw new ApiError(`TickCap API 请求失败（${response.status}）`, response.status, body)
    }
    return schema.parse(body)
  }

  return {
    push: async (input) => {
      const parsed = syncPushRequestSchema.parse(input)
      return request('/sync/push', syncPushResponseSchema, {
        method: 'POST',
        body: JSON.stringify(parsed),
      })
    },
    pull: async (cursor, limit = 500) => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
        throw new RangeError('sync pull limit 必须是 1–500 的整数')
      }
      const query = new URLSearchParams({ limit: String(limit) })
      if (cursor !== undefined) query.set('cursor', cursor)
      return request(`/sync/pull?${query.toString()}`, syncPullResponseSchema)
    },
  }
}
