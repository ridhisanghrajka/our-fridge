import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { updateNotificationPrefs, updateLocationReminder } from '../services/notifications';
import { PairUser } from '../types/PairUser';

export const useNotificationPrefs = (pairId: string | null, userName: string | null) => {
  const [prefs, setPrefs] = useState({
    notifyNotes: true,
    notifyFridgeUpdates: true,
  });
  const [reminders, setReminders] = useState<PairUser['reminders']>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pairId || !userName) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'pairs', pairId, 'users', userName);
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
  }, [pairId, userName]);

  const updatePrefs = async (newPrefs: { notifyNotes?: boolean; notifyFridgeUpdates?: boolean }) => {
    if (!pairId || !userName) return;
    await updateNotificationPrefs(pairId, userName, newPrefs);
  };

  const updateLocationReminders = async (
    type: 'departure' | 'store',
    location: { latitude: number; longitude: number; address: string; label?: string } | null
  ) => {
    if (!pairId || !userName) return;
    await updateLocationReminder(pairId, userName, type, location);
  };

  return {
    prefs,
    reminders,
    loading,
    updatePrefs,
    updateLocationReminders,
  };
};
