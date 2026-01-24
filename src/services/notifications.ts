import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

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
export async function registerForPushNotificationsAsync() {
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
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
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
export const updateUserMetadata = async (pairId: string, userName: string, token?: string) => {
  if (!pairId || !userName) return;

  const userRef = doc(db, 'pairs', pairId, 'users', userName);
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
  userName: string, 
  prefs: { notifyNotes?: boolean; notifyFridgeUpdates?: boolean }
) => {
  if (!pairId || !userName) return;

  const userRef = doc(db, 'pairs', pairId, 'users', userName);
  
  const updates: any = {};
  if (prefs.notifyNotes !== undefined) updates['prefs.notifyNotes'] = prefs.notifyNotes;
  if (prefs.notifyFridgeUpdates !== undefined) updates['prefs.notifyFridgeUpdates'] = prefs.notifyFridgeUpdates;

  try {
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
  }
};

/**
 * Update location reminders
 */
export const updateLocationReminder = async (
  pairId: string,
  userName: string,
  type: 'departure' | 'store',
  location: { latitude: number; longitude: number; address: string; label?: string } | null
) => {
  if (!pairId || !userName) return;

  const userRef = doc(db, 'pairs', pairId, 'users', userName);
  
  const updates: any = {};
  if (type === 'departure') {
    updates['reminders.departureLocation'] = location;
  } else {
    updates['reminders.storeLocation'] = location;
  }

  try {
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error updating location reminder:', error);
  }
};
