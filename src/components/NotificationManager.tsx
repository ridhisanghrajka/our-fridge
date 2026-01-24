import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { registerForPushNotificationsAsync, updateUserMetadata } from '../services/notifications';

interface NotificationManagerProps {
  pairId: string;
  userName: string;
}

/**
 * Headless component that manages push notification tokens and user presence
 */
export const NotificationManager: React.FC<NotificationManagerProps> = ({ pairId, userName }) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!pairId || !userName) return;

    // 1. Register for notifications on mount and update metadata
    const register = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        await updateUserMetadata(pairId, userName, token);
      } catch (error) {
        console.error('Error in notification registration:', error);
      }
    };

    register();

    // 2. Update presence when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        updateUserMetadata(pairId, userName).catch(err => 
          console.error('Error updating presence on foreground:', err)
        );
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [pairId, userName]);

  return null;
};
