import * as Notifications from 'expo-notifications'

export const QUICK_TICK_CATEGORY = 'tickcap-g1-quick-tick'
export const QUICK_TICK_ACTION = 'quick-tick-work'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function prepareProbeNotifications(): Promise<Notifications.PermissionStatus> {
  await Notifications.setNotificationCategoryAsync(QUICK_TICK_CATEGORY, [
    {
      identifier: QUICK_TICK_ACTION,
      buttonTitle: '💼 工作',
      options: { opensAppToForeground: false },
    },
  ])

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return current.status
  const requested = await Notifications.requestPermissionsAsync()
  return requested.status
}

export async function scheduleProbeNotification(): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'TickCap G1 通知验证',
      body: '点通知或使用「💼 工作」快捷操作',
      categoryIdentifier: QUICK_TICK_CATEGORY,
      data: { target: 'tickcap://today?focus=tickbar' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  })
}
