import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/googleConfig';
import Svg, { Path } from 'react-native-svg';

const CloseIcon = ({ size = 24, color = "#6B4B3E" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (latitude: number, longitude: number, address: string, name: string) => void;
  title: string;
  placeholder?: string;
  initialLocation?: { latitude: number; longitude: number; address: string; label?: string };
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  placeholder,
  initialLocation
}) => {
  const [locationName, setLocationName] = useState(initialLocation?.label || '');
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(initialLocation || null);
  const [mapRegion, setMapRegion] = useState({
    latitude: initialLocation?.latitude || 37.78825,
    longitude: initialLocation?.longitude || -122.4324,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (visible) {
      setLocationName(initialLocation?.label || '');
      if (initialLocation) {
        setSelectedLocation(initialLocation);
        const region = {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setMapRegion(region);
        mapRef.current?.animateToRegion(region, 1000);
      }
    }
  }, [visible, initialLocation]);

  const handleSelectPlace = (data: any, details: any = null) => {
    if (details) {
      const { lat, lng } = details.geometry.location;
      const address = data.description || details.formatted_address;
      
      const newLocation = {
        latitude: lat,
        longitude: lng,
        address: address,
      };
      
      setSelectedLocation(newLocation);
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setMapRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  };

  const handleSave = () => {
    if (selectedLocation) {
      onSave(
        selectedLocation.latitude, 
        selectedLocation.longitude, 
        selectedLocation.address,
        locationName.trim() || (title.toLowerCase().includes('store') ? 'Store' : 'Work')
      );
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseIcon />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Search for an address..."
              fetchDetails={true}
              onPress={handleSelectPlace}
              query={{
                key: GOOGLE_PLACES_API_KEY,
                language: 'en',
              }}
              styles={{
                container: {
                  flex: 0,
                  width: '100%',
                  zIndex: 10,
                },
                textInput: styles.searchInput,
                listView: styles.searchListView,
              }}
              enablePoweredByContainer={false}
              nearbyPlacesAPI="GooglePlacesSearch"
              debounce={400}
            />
          </View>

          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setSelectedLocation({
                  latitude,
                  longitude,
                  address: selectedLocation?.address || "Custom location on map"
                });
              }}
            >
              {selectedLocation && (
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title="Selected Location"
                  pinColor="#6B4B3E"
                />
              )}
            </MapView>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder={placeholder || "e.g. Home, Office, Tesco..."}
                value={locationName}
                onChangeText={setLocationName}
                placeholderTextColor="#A89B8F"
              />
            </View>

            {selectedLocation ? (
              <View style={styles.selectedAddressContainer}>
                <Text style={styles.selectedAddressLabel}>Selected Address:</Text>
                <Text style={styles.selectedAddressText} numberOfLines={2}>
                  {selectedLocation.address}
                </Text>
              </View>
            ) : (
              <Text style={styles.hintText}>Search for an address above or tap on the map</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !selectedLocation && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!selectedLocation}
          >
            <Text style={styles.saveButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7EE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E3D7',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#6B4B3E',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    zIndex: 100,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#3D2E25',
    borderWidth: 1,
    borderColor: '#E3D2C3',
  },
  searchListView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E3D2C3',
    elevation: 5,
    shadowColor: '#6B4B3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapWrapper: {
    height: 250,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#6B4B3E',
    marginBottom: 20,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#6B4B3E',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#3D2E25',
    borderWidth: 1,
    borderColor: '#E3D2C3',
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#FFF7EE',
    borderTopWidth: 1,
    borderTopColor: '#F3E3D7',
  },
  selectedAddressContainer: {
    marginBottom: 10,
  },
  selectedAddressLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#6B4B3E',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  selectedAddressText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#3D2E25',
  },
  hintText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B4B3E',
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#6B4B3E',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#6B4B3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});
