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
  TextInput,
  Linking,
  Alert,
  Switch,
  AppState,
  AppStateStatus
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '../config/googleConfig';
import Svg, { Path, Circle } from 'react-native-svg';
import { 
  requestForegroundPermissions, 
  requestBackgroundPermissions,
  checkLocationPermissions 
} from '../services/locationService';

const CloseIcon = ({ size = 24, color = "#6B4B3E" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LocationArrowIcon = ({ size = 20, color = "#6B4B3E" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 3L3 10.5L11.5 12.5L13.5 21L21 3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LocationOffIcon = ({ size = 24, color = "#6B4B3E" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11.48 3.49902C11.73 3.16902 12.27 3.16902 12.52 3.49902L15.05 6.84902C15.13 6.95902 15.18 7.08902 15.18 7.21902V7.21902C15.18 7.34902 15.13 7.47902 15.05 7.58902L12.52 10.939C12.27 11.269 11.73 11.269 11.48 10.939L8.95001 7.58902C8.87001 7.47902 8.82001 7.34902 8.82001 7.21902V7.21902C8.82001 7.08902 8.87001 6.95902 8.95001 6.84902L11.48 3.49902Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L2 22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (latitude: number, longitude: number, address: string, name: string, isEnabled: boolean) => void;
  title: string;
  placeholder?: string;
  initialLocation?: { latitude: number; longitude: number; address: string; label?: string; isEnabled?: boolean };
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  placeholder,
  initialLocation
}) => {
  const [isEditMode, setIsEditMode] = useState(!initialLocation);
  const [isEnabled, setIsEnabled] = useState(initialLocation?.isEnabled !== false);
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
  const [permissions, setPermissions] = useState({ foreground: false, background: false });
  const [showForegroundOverlay, setShowForegroundOverlay] = useState(false);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const checkPerms = async () => {
      const perms = await checkLocationPermissions();
      setPermissions(perms);
      if (perms.foreground) {
        setShowForegroundOverlay(false);
      }
    };

    if (visible) {
      checkPerms();
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && visible) {
        checkPerms();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible]);

  const handleToggleChange = async (value: boolean) => {
    if (value && !permissions.foreground) {
      const { granted } = await requestForegroundPermissions();
      if (!granted) {
        setShowForegroundOverlay(true);
        return;
      }
      setPermissions(prev => ({ ...prev, foreground: true }));
    }
    setIsEnabled(value);
    if (value && !isEditMode && !initialLocation) {
        setIsEditMode(true);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      const { granted } = await requestForegroundPermissions();
      if (!granted) {
        setShowForegroundOverlay(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setMapRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error("Error getting current location:", error);
    }
  };

  useEffect(() => {
    if (visible) {
      const editing = !initialLocation;
      setIsEditMode(editing);
      setIsEnabled(initialLocation?.isEnabled !== false);
      setLocationName(initialLocation?.label || '');
      setSelectedLocation(initialLocation || null);
      setShowForegroundOverlay(false);

      if (initialLocation) {
        const region = {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setMapRegion(region);
        mapRef.current?.animateToRegion(region, 1000);
      } else if (isEnabled) {
        handleGetCurrentLocation();
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

  const handleSave = async () => {
    if (!selectedLocation) return;

    if (isEditMode) {
      // Step 2 & 3: Soft Prompt and Background Permission
      if (!permissions.background || !permissions.notifications) {
        const alertTitle = !permissions.notifications ? "Enable Notifications?" : "Enable Background Alerts?";
        const alertMsg = !permissions.notifications 
            ? "To receive reminders, please enable notifications for OurFridge in your phone settings."
            : "To receive reminders when your phone is closed, please set Location to 'Always' in your phone settings.";

        Alert.alert(
          alertTitle,
          alertMsg,
          [
            { 
              text: "Not Now", 
              style: "cancel",
              onPress: () => finalizeSave() 
            },
            { 
              text: "Open Settings", 
              onPress: () => {
                Linking.openSettings();
                finalizeSave();
              }
            }
          ]
        );
      } else {
        finalizeSave();
      }
    } else if (!isEditMode && isEnabled) {
        // "Done" button action - check permissions if enabled, otherwise just close
        if (!permissions.background || !permissions.notifications) {
            // Fix permissions from View Mode
            const alertTitle = !permissions.notifications ? "Enable Notifications" : "Enable Always Allow";
            const alertMsg = !permissions.notifications
                ? "To make this reminder work, please enable notifications in settings."
                : "To make this reminder work in the background, please set Location to 'Always' in settings.";

            Alert.alert(
                alertTitle,
                alertMsg,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: () => Linking.openSettings() }
                ]
            );
        } else {
            // Already enabled and permissions are good, just ensure state is saved and close
            finalizeSave();
        }
    } else if (!isEnabled) {
        finalizeSave();
    }
  };

  const finalizeSave = () => {
    onSave(
      selectedLocation!.latitude, 
      selectedLocation!.longitude, 
      selectedLocation!.address,
      locationName.trim() || (title.toLowerCase().includes('store') ? 'Store' : 'Work'),
      isEnabled
    );
    onClose();
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

        <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Enable Reminder</Text>
            <Switch 
                value={isEnabled}
                onValueChange={handleToggleChange}
                trackColor={{ false: '#DCC8B9', true: '#E79B74' }}
                thumbColor={isEnabled ? '#6B4B3E' : '#FFF7EE'}
            />
        </View>

        {isEditMode && (
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
        )}

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.mapWrapper, (!isEnabled && !isEditMode) && styles.disabledMap]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={false}
              scrollEnabled={isEditMode}
              zoomEnabled={isEditMode}
              onPress={(e) => {
                if (!isEditMode) return;
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
            {isEditMode && (
                <TouchableOpacity 
                style={styles.myLocationButton} 
                onPress={handleGetCurrentLocation}
                activeOpacity={0.7}
                >
                <LocationArrowIcon />
                </TouchableOpacity>
            )}

            {showForegroundOverlay && (
                <View style={styles.permissionOverlay}>
                    <View style={styles.permissionCard}>
                        <LocationOffIcon size={40} color="#6B4B3E" />
                        <Text style={styles.permissionText}>
                            To find your current location on the map, we need your permission.
                        </Text>
                        <TouchableOpacity 
                            style={styles.openSettingsButton}
                            onPress={() => Linking.openSettings()}
                        >
                            <Text style={styles.openSettingsButtonText}>Open Settings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowForegroundOverlay(false)}>
                            <Text style={styles.maybeLaterText}>Maybe Later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location Name</Text>
              {isEditMode ? (
                  <TextInput
                    style={styles.nameInput}
                    placeholder={placeholder || "e.g. Home, Office, Tesco..."}
                    value={locationName}
                    onChangeText={setLocationName}
                    placeholderTextColor="#A89B8F"
                  />
              ) : (
                  <Text style={styles.staticValue}>{locationName || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.selectedAddressContainer}>
                <Text style={styles.selectedAddressLabel}>Selected Address:</Text>
                {selectedLocation ? (
                    <Text style={styles.selectedAddressText} numberOfLines={2}>
                        {selectedLocation.address}
                    </Text>
                ) : (
                    <Text style={styles.hintText}>Search for an address above or tap on the map</Text>
                )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
                styles.saveButton, 
                (!selectedLocation && isEditMode) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!selectedLocation && isEditMode}
          >
            <Text style={styles.saveButtonText}>
                {!isEnabled ? "Done" : 
                 (isEditMode ? "Confirm Location" : 
                  ((!permissions.background || !permissions.notifications) ? "Enable Permissions" : "Done"))}
            </Text>
          </TouchableOpacity>

          {!isEditMode && (
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setIsEditMode(true)}
              >
                  <Text style={styles.secondaryButtonText}>Edit Location Details</Text>
              </TouchableOpacity>
          )}
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
  toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E3D2C3',
  },
  toggleLabel: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#6B4B3E',
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
    marginTop: 16,
    marginBottom: 20,
  },
  disabledMap: {
      opacity: 0.5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFF7EE',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#6B4B3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#6B4B3E',
  },
  permissionOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 247, 238, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  permissionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      width: '100%',
      borderWidth: 1,
      borderColor: '#E3D2C3',
      shadowColor: '#6B4B3E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
  },
  permissionText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: '#6B4B3E',
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 24,
      lineHeight: 22,
  },
  openSettingsButton: {
      backgroundColor: '#6B4B3E',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      width: '100%',
      alignItems: 'center',
      marginBottom: 12,
  },
  openSettingsButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Inter-Bold',
  },
  maybeLaterText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: '#A89B8F',
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
  staticValue: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: '#3D2E25',
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
  secondaryButton: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: 'center',
  },
  secondaryButtonText: {
      fontSize: 15,
      fontFamily: 'Inter-SemiBold',
      color: '#6B4B3E',
      textDecorationLine: 'underline',
  },
});
