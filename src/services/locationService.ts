import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase.config';

export const GEOFENCING_TASK_NAME = 'OUR_FRIDGE_GEOFENCING_TASK';
const PAIR_ID_KEY = '@OurFridge:pairId';

/**
 * Define the background geofencing task
 */
TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error('Geofencing task error:', error);
    return;
  }

  const pairId = await AsyncStorage.getItem(PAIR_ID_KEY);
  if (!pairId) return;

  // We only care about Enter for store and Exit for work
  const isStoreEnter = eventType === Location.GeofencingEventType.Enter && region.identifier === 'store';
  const isDepartureExit = eventType === Location.GeofencingEventType.Exit && region.identifier === 'departure';

  if (isStoreEnter || isDepartureExit) {
    try {
      // Check if there are active items in the grocery list
      const itemsRef = collection(db, 'groceryItems');
      const q = query(
        itemsRef,
        where('pairId', '==', pairId),
        where('isDone', '==', false),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // List is not empty, send notification
        const title = isStoreEnter ? "You're near the store! 🛒" : "Leaving your location? 🏠";
        const body = isStoreEnter 
          ? "There are items on the fridge list. Check before you go in!"
          : "There are items on the grocery list if you're heading to the store!";

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      }
    } catch (err) {
      console.error('Error in geofencing background task:', err);
    }
  }
});

/**
 * Request foreground location permissions
 */
export const requestForegroundPermissions = async () => {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  return { granted: status === 'granted', canAskAgain };
};

/**
 * Request background location permissions
 */
export const requestBackgroundPermissions = async () => {
  const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
  return { granted: status === 'granted', canAskAgain };
};

/**
 * Check current permission status including notifications
 */
export const checkLocationPermissions = async () => {
  const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
  const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
  
  // Check notification status as well
  const { status: notificationStatus } = await Notifications.getPermissionsAsync();
  
  return {
    foreground: foregroundStatus === 'granted',
    background: backgroundStatus === 'granted',
    notifications: notificationStatus === 'granted'
  };
};

/**
 * Stop all geofencing tasks
 */
export const stopGeofencing = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK_NAME);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
  }
};

/**
 * Register geofences for departure and store locations
 */
export const registerGeofences = async (
  departure?: { latitude: number, longitude: number, isEnabled?: boolean }, 
  store?: { latitude: number, longitude: number, isEnabled?: boolean }
) => {
  const regions: Location.LocationRegion[] = [];

  if (departure && departure.isEnabled !== false) {
    regions.push({
      identifier: 'departure',
      latitude: departure.latitude,
      longitude: departure.longitude,
      radius: 300,
      notifyOnEnter: false,
      notifyOnExit: true,
    });
  }

  if (store && store.isEnabled !== false) {
    regions.push({
      identifier: 'store',
      latitude: store.latitude,
      longitude: store.longitude,
      radius: 200,
      notifyOnEnter: true,
      notifyOnExit: false,
    });
  }

  if (regions.length > 0) {
    await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
  } else {
    await stopGeofencing();
  }
};
