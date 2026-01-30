import { Timestamp } from 'firebase/firestore';

export interface PairUser {
  pushToken?: string;
  platform?: 'ios' | 'android' | 'web';
  lastSeenAt: Date | Timestamp;
  prefs: {
    notifyNotes: boolean;
    notifyFridgeUpdates: boolean;
  };
  lastNotifAt?: {
    fridgeUpdated?: Date | Timestamp;
    noteUpdated?: Date | Timestamp;
    locationDeparture?: Date | Timestamp;
    locationStore?: Date | Timestamp;
  };
  reminders?: {
    departureLocation?: {
      latitude: number;
      longitude: number;
      label?: string;
      address: string;
      isEnabled?: boolean;
    };
    storeLocation?: {
      latitude: number;
      longitude: number;
      address: string;
      label?: string;
      isEnabled?: boolean;
    };
  };
}
