import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permissions and get the Expo push token
 */
export async function registerForPushNotificationsAsync(requestIfNeeded: boolean = true) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted' && requestIfNeeded) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }
    
    // projectId is required for EAS Build
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId ?? 
      Constants.easConfig?.projectId;

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
    } catch (e) {
      console.log('Error getting push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Update user metadata (token, platform, lastSeenAt) in Firestore
 */
export const updateUserMetadata = async (pairId: string, userId: string, token?: string) => {
  if (!pairId || !userId) return;

  const userRef = doc(db, 'pairs', pairId, 'users', userId);
  const userSnap = await getDoc(userRef);

  const metadata: any = {
    lastSeenAt: Timestamp.now(),
  };

  if (token) {
    metadata.pushToken = token;
    metadata.platform = Platform.OS;
  }

  try {
    if (!userSnap.exists()) {
      // Initial setup for user
      await setDoc(userRef, {
        ...metadata,
        prefs: {
          notifyNotes: true,
          notifyFridgeUpdates: true,
        }
      });
    } else {
      await updateDoc(userRef, metadata);
    }
  } catch (error) {
    console.error('Error updating user metadata:', error);
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPrefs = async (
  pairId: string, 
  userId: string, 
  prefs: { notifyNotes?: boolean; notifyFridgeUpdates?: boolean }
) => {
  if (!pairId || !userId) return;

  const userRef = doc(db, 'pairs', pairId, 'users', userId);
  
  const updates: any = {};
  if (prefs.notifyNotes !== undefined) updates['prefs.notifyNotes'] = prefs.notifyNotes;
  if (prefs.notifyFridgeUpdates !== undefined) updates['prefs.notifyFridgeUpdates'] = prefs.notifyFridgeUpdates;

  try {
    await setDoc(userRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
  }
};

/**
 * Update location reminders
 */
export const updateLocationReminder = async (
  pairId: string,
  userId: string,
  type: 'departure' | 'store',
  location: { latitude: number; longitude: number; address: string; label?: string; isEnabled?: boolean } | null
) => {
  if (!pairId || !userId) return;

  const userRef = doc(db, 'pairs', pairId, 'users', userId);
  
  // Use dot notation correctly with updateDoc to update nested fields without overwriting the whole object
  // or use a structured object with setDoc merge. updateDoc with dot notation is actually preferred 
  // for nested fields in Firestore if the document exists. 
  // Given we switched to setDoc merge, we should use nested objects to ensure the structure is correct.
  
  const updates: any = {
    reminders: {}
  };
  
  if (type === 'departure') {
    updates.reminders.departureLocation = location;
  } else {
    updates.reminders.storeLocation = location;
  }

  try {
    await setDoc(userRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating location reminder:', error);
  }
};
