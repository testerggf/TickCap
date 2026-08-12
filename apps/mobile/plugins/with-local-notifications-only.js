const { withEntitlementsPlist } = require('expo/config-plugins')

/**
 * The personal-local build schedules notifications on-device and does not use
 * APNs. Expo Notifications adds the push entitlement by default, so remove it
 * after that plugin runs to keep Personal Team signing reproducible.
 */
module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (nextConfig) => {
    delete nextConfig.modResults['aps-environment']
    return nextConfig
  })
}
