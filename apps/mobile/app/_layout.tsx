import { useEffect } from 'react'
import { AppState } from 'react-native'
import { Stack, usePathname, useRouter } from 'expo-router'
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { DATABASE_NAME, initializeDatabase } from '../src/data/db/database'
import { trackEvent } from '../src/data/repositories/event-repository'
import { needsOnboarding } from '../src/data/repositories/onboarding-repository'
import {
  handleLocalNotificationResponse,
  QUICK_TICK_ACTION,
  reconcileLocalNotifications,
} from '../src/platform/local-notifications'
import {
  TickCapThemeProvider,
  useTickCapTheme,
} from '../src/ui/theme-provider'

function NotificationCoordinator() {
  const db = useSQLiteContext()
  const router = useRouter()
  useEffect(() => {
    let active = true
    const handleResponse = async (
      response: Notifications.NotificationResponse,
    ) => {
      const result = await handleLocalNotificationResponse(db, response)
      Notifications.clearLastNotificationResponse()
      if (!active || result === 'ignored') return
      router.replace({
        pathname: '/',
        params: { focus: result === 'quick_tag' ? 'timeline' : 'tickbar' },
      })
    }
    void Notifications.getLastNotificationResponseAsync().then(
      async (response) => {
        await trackEvent(db, 'app_open', {
          entry:
            response?.actionIdentifier === QUICK_TICK_ACTION
              ? 'notification_action'
              : response
                ? 'push'
                : 'direct',
          platform: 'ios',
          is_pwa: false,
          app_version: Constants.expoConfig?.version ?? 'unknown',
        })
        if (response) {
          await handleResponse(response)
        } else {
          await reconcileLocalNotifications(db, { trigger: 'app_open' })
        }
      },
    ).catch(() => undefined)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void handleResponse(response).catch(() => undefined)
      })
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          void reconcileLocalNotifications(db, { trigger: 'app_open' }).catch(
            () => undefined,
          )
        }
      },
    )
    return () => {
      active = false
      responseSubscription.remove()
      appStateSubscription.remove()
    }
  }, [db, router])
  return null
}

function StartupRedirect() {
  const db = useSQLiteContext()
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    let cancelled = false
    void needsOnboarding(db).then((needed) => {
      if (cancelled) return
      if (needed && pathname !== '/onboarding') {
        router.replace('/onboarding')
      } else if (!needed && pathname === '/onboarding') {
        router.replace('/')
      }
    })
    return () => {
      cancelled = true
    }
  }, [db, pathname, router])
  return null
}

function ThemedApp() {
  const { mode, theme } = useTickCapTheme()
  return (
    <>
      <NotificationCoordinator />
      <StartupRedirect />
      <StatusBar
        backgroundColor={theme.bg}
        style={mode === 'dark' ? 'light' : 'dark'}
      />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.bg },
          headerShown: false,
        }}
      />
    </>
  )
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      <TickCapThemeProvider>
        <ThemedApp />
      </TickCapThemeProvider>
    </SQLiteProvider>
  )
}
