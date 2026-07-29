import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
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

const INJECT_APP_FLAG = `
  window.__FITCHECK_APP__ = true;
  true;
`;

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        applicationNameForUserAgent="FitCheckApp/1.0"
        injectedJavaScriptBeforeContentLoaded={INJECT_APP_FLAG}
        allowsBackForwardNavigationGestures
        geolocationEnabled
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        originWhitelist={['*']}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
});
