/**
 * @tickcap/core —— 领域规则唯一实现（纯 TS，无平台依赖）。
 * 规格权威：docs/07 §2。三端（web/小程序/App）与 server 共享，禁止在外部复制这些逻辑。
 */
export * from './types'
export * from './time'
export * from './attribution'
export * from './infer'
export * from './gaps'
export * from './streak'
export * from './daily-context'
export * from './local-review'
export * from './uuid-v7'
export * from './export'
export * from './event-privacy'
export * from './record-timing'
export * from './backup'
export * from './restore'
export * from './backup-reminder'
export * from './notification'
