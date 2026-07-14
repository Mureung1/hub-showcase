import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// frontend-web URL (실기기에서는 localhost 대신 LAN IP 또는 배포 URL 사용)
const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || 'http://localhost:5173';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
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
