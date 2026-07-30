import { useEffect, useMemo, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const BASE_WEB_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || 'http://localhost:5173';

function resolveWebAppUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/$/, '');
  if (trimmed.endsWith('/user') || trimmed.includes('/user/')) {
    return trimmed;
  }
  return `${trimmed}/user`;
}

const WEB_APP_URL = resolveWebAppUrl(BASE_WEB_URL);

function buildSafeAreaScript(insets) {
  return `(function(){var r=document.documentElement;r.style.setProperty('--fitcheck-safe-top','${insets.top}px');r.style.setProperty('--fitcheck-safe-bottom','${insets.bottom}px');r.style.setProperty('--fitcheck-safe-left','${insets.left}px');r.style.setProperty('--fitcheck-safe-right','${insets.right}px');r.classList.add('fitcheck-app');window.__FITCHECK_APP__=true;})();true;`;
}

function FitCheckWebView() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const safeAreaScript = useMemo(() => buildSafeAreaScript(insets), [insets]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(safeAreaScript);
  }, [safeAreaScript]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        applicationNameForUserAgent="FitCheckApp/1.0"
        injectedJavaScriptBeforeContentLoaded="window.__FITCHECK_APP__=true;true;"
        injectedJavaScript={safeAreaScript}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(safeAreaScript);
        }}
        allowsBackForwardNavigationGestures
        geolocationEnabled
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={['*']}
        startInLoadingState
        contentInsetAdjustmentBehavior="never"
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FitCheckWebView />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf8',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
