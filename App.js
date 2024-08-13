import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, TextInput, Button, Text, FlatList, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location';

export default function App() {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [destination, setDestination] = useState('');
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [markers, setMarkers] = useState([
    { latitude: 0, longitude: 0 }, // Placeholder for user's location
    { latitude: 0, longitude: 0 }, // Placeholder for destination
  ]);

  // Ref for MapView to control the map
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Request permission to access location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        // Watch user's location continuously
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50, // Update every 50 meters
          },
          (location) => {
            const userLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            setMarkers([userLocation, markers[1]]); // Update starting point
            reverseGeocodeLocation(userLocation);
            // Center map on user location
            mapRef.current.animateToRegion({
              ...userLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        );
      } catch (error) {
        setError(error.message);
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (markers[1].latitude !== 0 && markers[1].longitude !== 0) {
      fetchRoute();
    }
  }, [markers]);

  const reverseGeocodeLocation = async (location) => {
    try {
      // Fetch address based on user's coordinates
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude}&lon=${location.longitude}&format=json`
      );

      if (response.data && response.data.display_name) {
        setAddress(response.data.display_name);
      } else {
        throw new Error('Address not found');
      }
    } catch (error) {
      setError(error.message);
      Alert.alert('Error', error.message);
    }
  };

  const fetchRoute = async () => {
    try {
      setLoading(true);
      const start = `${markers[0].longitude},${markers[0].latitude}`;
      const end = `${markers[1].longitude},${markers[1].latitude}`;

      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
      );

      const { routes } = response.data;
      if (routes && routes.length > 0) {
        const coordinates = routes[0].geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coordinates);
      } else {
        throw new Error('No routes found');
      }
    } catch (error) {
      setError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDestinationInput = async (text) => {
    setDestination(text);
    if (text.length > 2) {
      try {
        // Fetch suggestions based on input
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`
        );
        setSuggestions(response.data);
      } catch (error) {
        setError(error.message);
        Alert.alert('Error', error.message);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    const destinationLocation = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
    };
    setMarkers([markers[0], destinationLocation]); // Update destination
    setDestination(suggestion.display_name);
    setSuggestions([]); // Clear suggestions
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter destination"
          onChangeText={handleDestinationInput}
          value={destination}
        />
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(item)}
            >
              <Text>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {address ? <Text style={styles.address}>Your Location: {address}</Text> : null}

      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: markers[0].latitude || 37.78825,
          longitude: markers[0].longitude || -122.4324,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={`Marker ${index === 0 ? 'Start' : 'Destination'}`}
          />
        ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={3}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: 10,
    backgroundColor: 'white',
    zIndex: 1,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray',
  },
  address: {
    padding: 10,
    backgroundColor: 'white',
    fontSize: 16,
    zIndex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
