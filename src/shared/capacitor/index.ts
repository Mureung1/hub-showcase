export {
  getInsightApiOrigin,
  isNativeAndroid,
  parseApiOrigin,
  validateOptionalApiOrigin,
} from './runtime';
export type { ApiOriginEnv, CapacitorRuntime } from './runtime';
export { createAndroidSharePluginAdapter } from './android_share_plugin';
export type {
  AndroidShareInput,
  AndroidShareListenerHandle,
  AndroidShareNativePlugin,
  AndroidSharePluginAdapter,
} from './android_share_plugin';
