import React, { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Request permission to access location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      // Get the current location with high accuracy
      let { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest, // Set accuracy to highest for using both GPS and GLONASS
      });
      setLocation(coords);
      setLoading(false);
    })();
  }, []);

  // Inject JavaScript to post message with the user's location
  const injectJavaScript = `
    window.postMessage(${JSON.stringify(location)}, '*');
  `;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <WebView
      style={styles.container}
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
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
