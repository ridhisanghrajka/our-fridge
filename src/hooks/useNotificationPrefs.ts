import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { updateNotificationPrefs, updateLocationReminder } from '../services/notifications';
import { PairUser } from '../types/PairUser';
import { registerGeofences } from '../services/locationService';

export const useNotificationPrefs = (pairId: string | null, userId: string | null) => {
  const [prefs, setPrefs] = useState({
    notifyNotes: true,
    notifyFridgeUpdates: true,
  });
  const [reminders, setReminders] = useState<PairUser['reminders']>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pairId || !userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'pairs', pairId, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PairUser;
        if (data.prefs) {
          setPrefs({
            notifyNotes: data.prefs.notifyNotes ?? true,
            notifyFridgeUpdates: data.prefs.notifyFridgeUpdates ?? true,
          });
        }
        setReminders(data.reminders || {});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pairId, userId]);

  const updatePrefs = async (newPrefs: { notifyNotes?: boolean; notifyFridgeUpdates?: boolean }) => {
    if (!pairId || !userId) return;
    await updateNotificationPrefs(pairId, userId, newPrefs);
  };

  const updateLocationReminders = async (
    type: 'departure' | 'store',
    location: { latitude: number; longitude: number; address: string; label?: string; isEnabled?: boolean } | null
  ) => {
    if (!pairId || !userId) return;
    await updateLocationReminder(pairId, userId, type, location);
  };

  const saveAndRegisterLocation = async (
    type: 'departure' | 'store',
    location: { latitude: number; longitude: number; address: string; label?: string; isEnabled?: boolean } | null
  ) => {
    if (!pairId || !userId) return;
    
    // 1. Save to Firebase
    await updateLocationReminders(type, location);
    
    // 2. Register Geofences with updated data
    const updatedDeparture = type === 'departure' ? location : reminders?.departureLocation;
    const updatedStore = type === 'store' ? location : reminders?.storeLocation;
    
    await registerGeofences(
      updatedDeparture || undefined, 
      updatedStore || undefined
    );
  };

  return {
    prefs,
    reminders,
    loading,
    updatePrefs,
    updateLocationReminders,
    saveAndRegisterLocation,
  };
};
