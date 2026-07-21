export {
  getInsightApiOrigin,
  isNativeAndroid,
  parseApiOrigin,
  validateOptionalApiOrigin,
} from './runtime';
export type { ApiOriginEnv, CapacitorRuntime } from './runtime';
export {
  createDefaultMobileOAuth,
  createMobileOAuth,
  MOBILE_OAUTH_CALLBACK_URL,
} from './mobile_oauth';
export type { MobileOAuth, MobileOAuthContext } from './mobile_oauth';
export { createAndroidSharePluginAdapter } from './android_share_plugin';
export type {
  AndroidShareInput,
  AndroidShareListenerHandle,
  AndroidShareNativePlugin,
  AndroidSharePluginAdapter,
} from './android_share_plugin';
