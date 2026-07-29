declare global {
  interface Window {
    __FITCHECK_APP__?: boolean;
  }
}

/** Expo WebView에서 injectedJavaScriptBeforeContentLoaded로 설정됨 */
export function isFitCheckApp(): boolean {
  return typeof window !== 'undefined' && window.__FITCHECK_APP__ === true;
}
