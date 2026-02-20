import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { NativeModules, Platform } from 'react-native';
import { GroceryItem } from '../types/GroceryItem';
import { SharedNote, CanvasElement } from '../types/SharedNote';

const { WidgetBridge } = NativeModules;
const APP_GROUP = 'group.ridhisanghrajka.ourfridge';

export interface WidgetSnapshot {
  fridgeName: string;
  items: string[];
  noteSnippet: string;
  noteElements: CanvasElement[];
  updatedAt: number;
  isLocked: boolean;
}

let syncDebounceTimer: any = null;
const DEBOUNCE_MS = 1000;

/**
 * Prepares the widget snapshot data from raw items and notes.
 */
const prepareWidgetSnapshot = (
  items: GroceryItem[],
  note: SharedNote | null,
  fridgeName: string,
  isPremium: boolean
): WidgetSnapshot => {
  const isLocked = !isPremium;
  let activeItems: string[] = [];
  let noteSnippet = "No notes yet";
  let noteElements: CanvasElement[] = [];

  if (isLocked) {
    fridgeName = "Our Fridge";
    activeItems = ["Subscription required"];
    noteSnippet = "Subscribe to see your shared list and notes on your home screen.";
  } else {
    activeItems = [...items]
      .filter(item => !item.isDone)
      .sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds * 1000 || 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds * 1000 || 0;
        return timeB - timeA;
      })
      .slice(0, 5)
      .map(item => {
        const emoji = item.emoji ? `${item.emoji} ` : "";
        return `${emoji}${item.name}`;
      });

    if (note && note.content) {
      try {
        noteElements = JSON.parse(note.content);
        const textElements = noteElements
          .filter(el => el.type === 'text')
          .map(el => el.data);
        
        if (textElements.length > 0) {
          noteSnippet = textElements.join(" ").substring(0, 60);
        } else if (noteElements.length > 0) {
          noteSnippet = "Handwritten note";
        }
      } catch (e) {
        console.error("Error parsing note for widget snapshot:", e);
      }
    }
  }

  return {
    fridgeName,
    items: activeItems,
    noteSnippet,
    noteElements,
    updatedAt: Date.now(),
    isLocked,
  };
};

/**
 * Syncs the current fridge state to the iOS widget shared storage.
 * Splits into an immediate local sync and a debounced remote sync.
 */
export const syncDataToWidget = async (
  items: GroceryItem[],
  note: SharedNote | null,
  fridgeName: string = "Our Fridge",
  isPremium: boolean = false,
  trigger: string = 'unknown'
) => {
  try {
    // 1. Prepare data immediately
    const snapshot = prepareWidgetSnapshot(items, note, fridgeName, isPremium);
    const json = JSON.stringify(snapshot);

    // 2. IMMEDIATE LOCAL SYNC (Your Phone)
    // This bypasses the debounce to ensure your own widget updates instantly,
    // especially important when the app is being backgrounded.
    const usesNativeWrite = Platform.OS === 'ios' && typeof WidgetBridge?.setWidgetData === 'function';
    
    if (usesNativeWrite) {
      WidgetBridge.setWidgetData(json);
    } else if (Platform.OS === 'ios') {
      // Fallback for iOS if bridge is missing or older
      await SharedGroupPreferences.setItem('widgetData', json, APP_GROUP);
      if (WidgetBridge?.reloadWidget) {
        WidgetBridge.reloadWidget();
      }
    }

    // 3. DEBOUNCED REMOTE SYNC (Partner's Phone / Firestore)
    // We keep the debounce for any logic that might trigger remote updates (like Cloud Functions)
    // to prevent spamming notifications or database writes.
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }

    // If we are backgrounding, we want to ensure the sync finishes immediately
    const isBackgrounding = trigger.includes('appBackground');
    const delay = isBackgrounding ? 0 : DEBOUNCE_MS;

    return new Promise<void>((resolve) => {
      syncDebounceTimer = setTimeout(async () => {
        try {
          // Note: Currently, the Firestore write happens in the components themselves
          // via useGroceryItems/useSharedNote hooks. This service primarily handles
          // the Widget communication. If we ever add direct Firestore writes here,
          // they would go in this debounced block.
          
          // For now, we resolve immediately as the local sync is already done.
          resolve();
        } catch (error) {
          console.error("Error in debounced widget sync:", error);
          resolve();
        }
      }, delay);
    });
  } catch (error) {
    console.error("Error in syncDataToWidget:", error);
  }
};
