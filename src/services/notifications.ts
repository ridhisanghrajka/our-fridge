import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import { doc, setDoc, updateDoc, Timestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { syncDataToWidget } from './widgetSync';

const WIDGET_PUSH_TASK_NAME = 'OUR_FRIDGE_WIDGET_PUSH_TASK';

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const title = notification?.request?.content?.title;
    const hasTitle = !!title && title.length > 0;

    return {
      // Show banner/sound if there is a title, regardless of widget update flag
      shouldShowBanner: hasTitle,
      shouldShowList: hasTitle,
      shouldPlaySound: hasTitle,
      shouldSetBadge: false,
    };
  },
});

/**
 * Core widget refresh logic used by multiple entrypoints:
 * - Foreground listener (when app is running)
 * - Background task (when iOS wakes app for a silent push)
 */
async function syncWidgetFromStoredSession(): Promise<void> {
  const { getStoredPairId, getStoredUserName } = require('./pairing');
  const pairId = await getStoredPairId();
  const userName = await getStoredUserName();

  if (!pairId) return;

  try {
    // 1. Fetch latest grocery items
    const itemsRef = collection(db, 'groceryItems');
    const q = query(itemsRef, where('pairId', '==', pairId));
    const itemsSnap = await getDocs(q);
    const items = itemsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as any[];

    // 2. Fetch latest note
    const noteRef = doc(db, 'sharedNotes', pairId);
    const noteSnap = await getDoc(noteRef);
    const note = noteSnap.exists() ? {
      pairId: noteSnap.data().pairId,
      content: noteSnap.data().content || "[]",
      updatedAt: noteSnap.data().updatedAt?.toDate() || new Date(),
    } as any : null;

    // 3. Get premium status + name
    const pairRef = doc(db, 'pairs', pairId);
    const pairSnap = await getDoc(pairRef);
    const isPremium = pairSnap.exists() ? pairSnap.data().isPremiumEnabled : false;
    const fridgeName = pairSnap.exists()
      ? pairSnap.data().fridgeName
      : (userName ? `${userName}'s Fridge` : 'Our Fridge');

    // 4. Sync to widget
    await syncDataToWidget(items, note, fridgeName, isPremium, 'PushSync:storedSession');
  } catch (error) {
    // swallow
  }
}

/**
 * Foreground listener: runs when the app process is alive.
 */
Notifications.addNotificationReceivedListener(async (notification) => {
  const data: any = notification?.request?.content?.data;
  if (data?.type === 'WIDGET_UPDATE') {
    await syncWidgetFromStoredSession();
  }
});

/**
 * Background notification task: allows iOS silent pushes to execute JS and refresh the widget.
 * Must be defined at module scope.
 */
TaskManager.defineTask(WIDGET_PUSH_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("Background task error:", error);
    return;
  }

  // expo-notifications passes different shapes depending on SDK; handle both defensively.
  const notification = data?.notification ?? data;
  const notifData: any = notification?.request?.content?.data ?? notification?.data;

  if (notifData?.type === 'WIDGET_UPDATE') {
    // We MUST await this to ensure the task finishes before the OS kills the process.
    // Silent pushes only give the app a few seconds of background time.
    await syncWidgetFromStoredSession();
  }
});

async function ensureWidgetPushTaskRegistered(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_PUSH_TASK_NAME);
    if (!isRegistered) {
      await Notifications.registerTaskAsync(WIDGET_PUSH_TASK_NAME);
    }
  } catch (e) {
    // swallow
  }
}

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

    // Ensure the background task is registered so silent pushes can refresh the widget.
    // (Registration doesn't prompt; permission prompt is handled above.)
    await ensureWidgetPushTaskRegistered();
    
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
      const writeData = {
        ...metadata,
        prefs: {
          notifyNotes: true,
          notifyFridgeUpdates: true,
        }
      };
      await setDoc(userRef, writeData);
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
