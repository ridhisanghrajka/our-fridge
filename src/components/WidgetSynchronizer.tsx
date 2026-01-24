import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useGroceryItems } from '../hooks/useGroceryItems';
import { useSharedNote } from '../hooks/useSharedNote';
import { usePairing } from '../hooks/usePairing';
import { syncDataToWidget } from '../services/widgetSync';

/**
 * Headless component that keeps the iOS widget data in sync with Firestore.
 * It triggers a sync whenever grocery items or notes change, 
 * and also when the app is backgrounded to ensure the widget is fresh.
 */
export const WidgetSynchronizer: React.FC = () => {
  const { pairId, userName, pair, user } = usePairing();
  const { items } = useGroceryItems(pairId, userName);
  const { note } = useSharedNote(pairId, userName);
  const appState = useRef(AppState.currentState);

  const fridgeName = pair?.fridgeName || (userName ? `${userName}'s Fridge` : 'Our Fridge');
  const isPremium = pair?.isPremiumEnabled || user?.isPremium || false;
  const trialStartedAt = user?.trialStartedAt || null;

  // Sync whenever data changes
  useEffect(() => {
    if (pairId && items.length >= 0) {
      syncDataToWidget(items, note, fridgeName, isPremium, trialStartedAt);
    }
  }, [items, note, fridgeName, pairId, isPremium, trialStartedAt]);

  // Ensure fresh sync when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        if (pairId && items.length >= 0) {
          syncDataToWidget(items, note, fridgeName, isPremium, trialStartedAt);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [items, note, fridgeName, pairId]);

  return null;
};
