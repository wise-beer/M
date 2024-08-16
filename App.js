import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, TextInput, FlatList, TouchableOpacity, ScrollView, Text, Image } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location';
import { Svg, Path } from 'react-native-svg';

export default function App() {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [destination, setDestination] = useState('');
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [markers, setMarkers] = useState([
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
  ]);

  // Ref for MapView to control the map
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 50,
          },
          (location) => {
            const userLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            setMarkers([userLocation, markers[1]]);
            reverseGeocodeLocation(userLocation);

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
    setMarkers([markers[0], destinationLocation]);
    setDestination(suggestion.display_name);
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      {/* MapView */}
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

      {/* Search Bar and Buttons */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          onChangeText={handleDestinationInput}
          value={destination}
        />
      </View>

      <View style={styles.inputContainer}>
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

      {/* User Location Address */}
      {address ? <Text style={styles.address}>Your Location: {address}</Text> : null}

      {/* Loading Indicator */}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {/* Floating Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.navigationButton}>
          <Image
            style={styles.tinyLogo}
            source={require('./assets/UI/geo.png')}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navigationButton}>
          <Image
            style={styles.tinyLogo}
            source={require('./assets/UI/strelka.png')}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Svg height="100" width="100%" viewBox="0 0 100 100" style={styles.bottomNavShape}>
        <Path d="M320.035 0H221.014C215.905 0 211.242 2.75273 208.605 7.14546C203.561 15.5382 194.391 21.1818 183.968 21.1818H159.549C149.125 21.1818 139.955 15.5382 134.912 7.14546C132.274 2.75636 127.608 0 122.503 0H23.4846C10.5685 0 0 10.6073 0 23.5709C0 36.5345 10.5685 47.1418 23.4846 47.1418H320.035C332.952 47.1418 343.52 36.5345 343.52 23.5709C343.52 10.6073 332.952 0 320.035 0Z" fill="white"/>

        </Svg>
        <View style={styles.bottomNavButtons}>
          <TouchableOpacity style={styles.navButton}>
            <Image
              style={styles.tinyLogo}
              source={require('./assets/UI/settings.png')}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButtonCenter}>
            <Image
              style={styles.homeIcon}
              source={require('./assets/UI/settings.png')}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Image
              style={styles.tinyLogo}
              source={require('./assets/UI/settings.png')}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
    zIndex: 0,
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  inputContainer: {
    position: 'absolute',
    top: 100,
    left: 10,
    right: 10,
    zIndex: 2,
  },
  suggestionItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  address: {
    position: 'absolute',
    top: 160,
    left: 10,
    right: 10,
    zIndex: 2,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 180,
    right: 10,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
  },
  navigationButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  bottomNavShape: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  bottomNavButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  navButtonCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  homeIcon: {
    width: 35,
    height: 35,
  },
});
