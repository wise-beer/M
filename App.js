import React, { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      let { coords } = await Location.getCurrentPositionAsync({});
      setLocation(coords);
      setLoading(false);
    })();
  }, []);

  const injectJavaScript = `
    window.postMessage(${JSON.stringify(location)}, '*');
  `;

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <WebView
      javaScriptEnabled={true}
      startInLoadingState={true}
      scrollEnabled={false}
      injectedJavaScript={injectJavaScript}
      onMessage={(event) => {
        console.log('Message from WebView:', event.nativeEvent.data);
      }}
      originWhitelist={['*']}
      source={require('./assets/index.html')}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
});
