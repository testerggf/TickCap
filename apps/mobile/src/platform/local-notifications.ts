import type { SQLiteDatabase } from 'expo-sqlite'
import * as Notifications from 'expo-notifications'
import {
  notificationDataSchema,
  type LocalNotificationStatus,
  type NotificationPermissionStatus,
} from '@tickcap/api'
import {
  buildNotificationOperationKey,
  logicalToday,
  planLocalNotifications,
} from '@tickcap/core'
import { createNotificationCapsule } from '../data/repositories/capsule-repository'
import { trackEvent } from '../data/repositories/event-repository'
import {
  getLocalNotificationStatus,
  saveLocalNotificationStatus,
} from '../data/repositories/notification-status-repository'
import { getOnboardingPreferences } from '../data/repositories/onboarding-repository'
import { getSealByDate } from '../data/repositories/seal-repository'
import { getTimeSettings } from '../data/repositories/settings-repository'
import { listQuickTags } from '../data/repositories/tag-repository'

export const LOCAL_REMINDER_CATEGORY = 'tickcap-local-reminder'
export const QUICK_TICK_ACTION = 'tickcap-quick-tick'

const reconciliationQueues = new WeakMap<SQLiteDatabase, Promise<void>>()

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function permissionStatus(
  permissions: Notifications.NotificationPermissionsStatus,
): NotificationPermissionStatus {
  switch (permissions.ios?.status) {
    case Notifications.IosAuthorizationStatus.DENIED:
      return 'denied'
    case Notifications.IosAuthorizationStatus.AUTHORIZED:
      return 'authorized'
    case Notifications.IosAuthorizationStatus.PROVISIONAL:
      return 'provisional'
    case Notifications.IosAuthorizationStatus.EPHEMERAL:
      return 'ephemeral'
    default:
      return 'not_determined'
  }
}

function canSchedule(status: NotificationPermissionStatus): boolean {
  return (
    status === 'authorized' ||
    status === 'provisional' ||
    status === 'ephemeral'
  )
}

async function cancelStoredNotifications(
  status: LocalNotificationStatus,
): Promise<void> {
  const identifiers = [
    status.scheduled.interval?.identifier,
    status.scheduled.seal?.identifier,
  ].filter((identifier): identifier is string => identifier !== undefined)
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    ),
  )
}

async function registerQuickTickCategory(
  db: SQLiteDatabase,
): Promise<Awaited<ReturnType<typeof listQuickTags>>[number] | null> {
  const quickTag = (await listQuickTags(db, 1))[0] ?? null
  await Notifications.setNotificationCategoryAsync(
    LOCAL_REMINDER_CATEGORY,
    quickTag
      ? [
          {
            identifier: QUICK_TICK_ACTION,
            buttonTitle: `${quickTag.emoji} 记录${quickTag.name}`,
            options: { opensAppToForeground: true },
          },
        ]
      : [],
    { previewPlaceholder: 'TickCap 提醒' },
  )
  return quickTag
}

export async function reconcileLocalNotifications(
  db: SQLiteDatabase,
  options: { trigger: 'app_open' | 'record' | 'seal' | 'settings'; now?: Date },
): Promise<LocalNotificationStatus> {
  const previous = reconciliationQueues.get(db) ?? Promise.resolve()
  const reconciliation = previous.then(
    () => performNotificationReconciliation(db, options),
    () => performNotificationReconciliation(db, options),
  )
  reconciliationQueues.set(
    db,
    reconciliation.then(
      () => undefined,
      () => undefined,
    ),
  )
  return reconciliation
}

async function performNotificationReconciliation(
  db: SQLiteDatabase,
  options: { trigger: 'app_open' | 'record' | 'seal' | 'settings'; now?: Date },
): Promise<LocalNotificationStatus> {
  const now = options.now ?? new Date()
  const current = await getLocalNotificationStatus(db)
  const systemPermission = permissionStatus(
    await Notifications.getPermissionsAsync(),
  )
  const base: LocalNotificationStatus = {
    ...current,
    enabled: current.enabled && canSchedule(systemPermission),
    permission_status: systemPermission,
    last_app_open_at:
      options.trigger === 'app_open'
        ? now.toISOString()
        : current.last_app_open_at,
    consecutive_missed:
      options.trigger === 'record' ? 0 : current.consecutive_missed,
  }
  if (
    options.trigger === 'app_open' &&
    current.scheduled.interval &&
    new Date(current.scheduled.interval.fire_at).getTime() <= now.getTime()
  ) {
    const missed = base.consecutive_missed + 1
    base.consecutive_missed = missed >= 3 ? 0 : missed
    base.snooze_level =
      missed >= 3
        ? ((Math.min(2, base.snooze_level + 1) as 0 | 1 | 2))
        : base.snooze_level
  }
  if (options.trigger === 'record') base.snooze_level = 0
  if (!base.enabled) {
    await cancelStoredNotifications(current)
    return saveLocalNotificationStatus(db, {
      ...base,
      last_reconciled_at: now.toISOString(),
      scheduled: { interval: null, seal: null },
    })
  }

  const [settings, preferences, lastCapsule, quickTag] = await Promise.all([
    getTimeSettings(db),
    getOnboardingPreferences(db),
    db.getFirstAsync<{ end_at: string }>(
      `SELECT end_at FROM capsules
       WHERE deleted_at IS NULL ORDER BY end_at DESC LIMIT 1`,
    ),
    registerQuickTickCategory(db),
  ])
  const today = logicalToday(now, settings)
  const [todaySeal, todayCapsuleRow] = await Promise.all([
    getSealByDate(db, today),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM capsules
       WHERE date = ? AND deleted_at IS NULL`,
      today,
    ),
  ])
  const plan = planLocalNotifications({
    now,
    settings,
    reminderIntervalMin: preferences.reminder_interval_min,
    snoozeLevel: base.snooze_level,
    sealReminderMin: preferences.seal_reminder_min,
    lastCapsuleEndAt: lastCapsule ? new Date(lastCapsule.end_at) : null,
    lastAppOpenAt: base.last_app_open_at
      ? new Date(base.last_app_open_at)
      : null,
    todayHasCapsules: (todayCapsuleRow?.count ?? 0) > 0,
    todaySealed: todaySeal !== null,
  })

  const intervalNotificationId = `local-interval-${plan.intervalAt.toISOString()}`
  const sealNotificationId = plan.sealAt
    ? `local-seal-${plan.sealAt.toISOString()}`
    : null
  const newlyScheduled: string[] = []
  try {
    const intervalIdentifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '给这一刻留一颗胶囊？',
        body: '这会儿在忙什么？记下一笔就好。',
        categoryIdentifier: LOCAL_REMINDER_CATEGORY,
        data: {
          target: 'tickcap://today?focus=tickbar',
          notification_id: intervalNotificationId,
          ...(quickTag ? { tag_id: quickTag.id } : {}),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.intervalAt,
      },
    })
    newlyScheduled.push(intervalIdentifier)
    const sealIdentifier = plan.sealAt
      ? await Notifications.scheduleNotificationAsync({
          content: {
            title: '今天已经有了形状',
            body: '想把今天封存下来吗？也可以晚一点再来。',
            data: {
              target: 'tickcap://today?focus=timeline',
              notification_id: sealNotificationId,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: plan.sealAt,
          },
        })
      : null
    if (sealIdentifier) newlyScheduled.push(sealIdentifier)
    await cancelStoredNotifications(current)
    return saveLocalNotificationStatus(db, {
      ...base,
      last_reconciled_at: now.toISOString(),
      scheduled: {
        interval: {
          identifier: intervalIdentifier,
          notification_id: intervalNotificationId,
          fire_at: plan.intervalAt.toISOString(),
        },
        seal:
          sealIdentifier && sealNotificationId && plan.sealAt
            ? {
                identifier: sealIdentifier,
                notification_id: sealNotificationId,
                fire_at: plan.sealAt.toISOString(),
              }
            : null,
      },
    })
  } catch (error) {
    await Promise.all(
      newlyScheduled.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
    )
    throw error
  }
}

export async function scheduleLocalNotificationProbe(
  db: SQLiteDatabase,
  now = new Date(),
): Promise<string> {
  const quickTag = await registerQuickTickCategory(db)
  const notificationId = `local-probe-${now.toISOString()}`
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'TickCap 本地提醒验证',
      body: quickTag
        ? `可以直接记录「${quickTag.name}」，也可以打开滴答栏。`
        : '点开后会直接回到滴答栏。',
      categoryIdentifier: LOCAL_REMINDER_CATEGORY,
      data: {
        target: 'tickcap://today?focus=tickbar',
        notification_id: notificationId,
        ...(quickTag ? { tag_id: quickTag.id } : {}),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  })
}

export async function runQuickTickIdempotencyProbe(
  db: SQLiteDatabase,
  now = new Date(),
): Promise<{ capsuleId: string; operationKey: string } | null> {
  const quickTag = (await listQuickTags(db, 1))[0] ?? null
  if (!quickTag) return null
  const operationKey = buildNotificationOperationKey(
    `local-idempotency-probe-${now.toISOString()}`,
    QUICK_TICK_ACTION,
    quickTag.id,
  )
  const settings = await getTimeSettings(db)
  const first = await createNotificationCapsule(
    db,
    { tagId: quickTag.id, operationKey },
    settings,
    now,
  )
  const second = await createNotificationCapsule(
    db,
    { tagId: quickTag.id, operationKey },
    settings,
    now,
  )
  if (first.id !== second.id) {
    throw new Error('重复通知 action 产生了不同胶囊')
  }
  return { capsuleId: first.id, operationKey }
}

export async function requestLocalNotificationPermission(
  db: SQLiteDatabase,
  trigger: 'first_seal' | 'settings',
  now = new Date(),
): Promise<LocalNotificationStatus> {
  const current = await getLocalNotificationStatus(db)
  const existing = permissionStatus(await Notifications.getPermissionsAsync())
  let finalStatus = existing
  if (existing === 'not_determined') {
    finalStatus = permissionStatus(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: false },
      }),
    )
    await trackEvent(
      db,
      'notification_permission',
      {
        platform: 'ios',
        result:
          finalStatus === 'provisional'
            ? 'provisional'
            : canSchedule(finalStatus)
              ? 'granted'
              : 'denied',
        trigger,
      },
      now,
    )
  }
  const next = await saveLocalNotificationStatus(db, {
    ...current,
    enabled: canSchedule(finalStatus),
    permission_status: finalStatus,
    permission_requested_at:
      existing === 'not_determined'
        ? now.toISOString()
        : current.permission_requested_at,
  })
  if (!next.enabled) return next
  return reconcileLocalNotifications(db, { trigger: 'settings', now })
}

export async function disableLocalNotifications(
  db: SQLiteDatabase,
  now = new Date(),
): Promise<LocalNotificationStatus> {
  const current = await getLocalNotificationStatus(db)
  await cancelStoredNotifications(current)
  return saveLocalNotificationStatus(db, {
    ...current,
    enabled: false,
    last_reconciled_at: now.toISOString(),
    scheduled: { interval: null, seal: null },
  })
}

export async function handleLocalNotificationResponse(
  db: SQLiteDatabase,
  response: Notifications.NotificationResponse,
  now = new Date(),
): Promise<'quick_tag' | 'open' | 'ignored'> {
  const parsed = notificationDataSchema.safeParse(
    response.notification.request.content.data,
  )
  if (!parsed.success) return 'ignored'
  const data = parsed.data
  if (response.actionIdentifier === QUICK_TICK_ACTION) {
    if (!data.notification_id || !data.tag_id) return 'ignored'
    const settings = await getTimeSettings(db)
    await createNotificationCapsule(
      db,
      {
        tagId: data.tag_id,
        operationKey: buildNotificationOperationKey(
          data.notification_id,
          QUICK_TICK_ACTION,
          data.tag_id,
        ),
      },
      settings,
      now,
    )
    const current = await getLocalNotificationStatus(db)
    await saveLocalNotificationStatus(db, {
      ...current,
      consecutive_missed: 0,
      snooze_level: 0,
      scheduled: { ...current.scheduled, interval: null },
    })
    await reconcileLocalNotifications(db, { trigger: 'record', now })
    return 'quick_tag'
  }
  await trackEvent(db, 'reminder_click', {
    channel: 'local',
    snooze_level: 0,
    action: 'open',
  }, now)
  const current = await getLocalNotificationStatus(db)
  await saveLocalNotificationStatus(db, {
    ...current,
    consecutive_missed: 0,
    snooze_level: 0,
    scheduled: { ...current.scheduled, interval: null },
  })
  await reconcileLocalNotifications(db, { trigger: 'app_open', now })
  return 'open'
}
