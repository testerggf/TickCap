import { describe, expect, it } from 'vitest'
import {
  LOCAL_BACKUP_FORMAT_VERSION,
  localBackupSchema,
  type LocalBackup,
} from '../src'

const timestamp = '2026-08-10T12:00:00.000Z'

function backupFixture(): LocalBackup {
  return {
    kind: 'tickcap-local-backup',
    format_version: LOCAL_BACKUP_FORMAT_VERSION,
    exported_at: timestamp,
    app_version: '0.1.0',
    local_schema_version: 1,
    payload: {
      preferences: {
        time_settings: {
          timezone: 'Asia/Shanghai',
          day_boundary_min: 240,
          wake_default_min: 480,
        },
        onboarding_preferences: {
          completed: true,
          reminder_interval_min: 60,
          seal_reminder_min: 1290,
        },
        appearance_preferences: {
          visual_theme: 'chronoAmber',
          color_scheme: 'system',
        },
      },
      tables: {
        tags: [],
        capsules: [],
        day_seals: [],
        ai_reports: [],
      },
    },
    integrity: {
      algorithm: 'sha256',
      payload_sha256: 'a'.repeat(64),
    },
  }
}

describe('个人本地版完整备份契约（07 §5A.2）', () => {
  it('显式记录格式、数据库版本、偏好、业务表和校验值', () => {
    expect(localBackupSchema.safeParse(backupFixture()).success).toBe(true)
  })

  it('拒绝缺少偏好或格式错误的校验值', () => {
    const missingPreference = backupFixture()
    delete (missingPreference.payload.preferences as Partial<
      typeof missingPreference.payload.preferences
    >).appearance_preferences
    expect(localBackupSchema.safeParse(missingPreference).success).toBe(false)

    const badHash = backupFixture()
    badHash.integrity.payload_sha256 = 'not-a-sha256'
    expect(localBackupSchema.safeParse(badHash).success).toBe(false)
  })

  it('拒绝重复稳定 ID、重复封存日期和悬空标签引用', () => {
    const duplicated = backupFixture()
    duplicated.payload.tables.tags = [
      {
        id: '019fae57-cb8b-7470-b1c3-ef7fe9452e35',
        name: '工作',
        emoji: '💼',
        color: '#000000',
        parent_id: null,
        sort: 0,
        archived_at: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
      {
        id: '019fae57-cb8b-7470-b1c3-ef7fe9452e35',
        name: '重复',
        emoji: '💼',
        color: '#000000',
        parent_id: null,
        sort: 1,
        archived_at: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      },
    ]
    expect(localBackupSchema.safeParse(duplicated).success).toBe(false)
  })
})
