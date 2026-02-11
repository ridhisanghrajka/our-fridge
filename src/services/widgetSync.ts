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
 * Syncs the current fridge state to the iOS widget shared storage.
 */
export const syncDataToWidget = async (
  items: GroceryItem[],
  note: SharedNote | null,
  fridgeName: string = "Our Fridge",
  isPremium: boolean = false,
  trigger: string = 'unknown'
) => {
  // Clear any pending sync
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  return new Promise<void>((resolve) => {
    syncDebounceTimer = setTimeout(async () => {
      try {
        const isLocked = !isPremium;

    // 1. Prepare items
    let activeItems: string[] = [];
    let noteSnippet = "No notes yet";
    let noteElements: CanvasElement[] = [];

    if (isLocked) {
      fridgeName = "Our Fridge";
      activeItems = ["Subscription required"];
      noteSnippet = "Subscribe to see your shared list and notes on your home screen.";
    } else {
      activeItems = items
        .filter(item => !item.isDone)
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
          console.error("Error parsing note for widget:", e);
        }
      }
    }

    const snapshot: WidgetSnapshot = {
      fridgeName,
      items: activeItems,
      noteSnippet,
      noteElements,
      updatedAt: Date.now(),
      isLocked,
    };

    // 3. Save to shared group preferences (and/or native bridge)
    // Prefer the native bridge on iOS because it writes to UserDefaults and forces a widget reload
    // with better cross-process propagation.
    const json = JSON.stringify(snapshot);
    const usesNativeWrite = Platform.OS === 'ios' && typeof WidgetBridge?.setWidgetData === 'function';
    if (usesNativeWrite) {
      WidgetBridge.setWidgetData(json);
    } else {
      await SharedGroupPreferences.setItem('widgetData', json, APP_GROUP);
      // 4. Prompt iOS to refresh the widget (fallback path)
      if (Platform.OS === 'ios' && WidgetBridge?.reloadWidget) {
        WidgetBridge.reloadWidget();
      }
    }
    resolve();
  } catch (error) {
    // swallow
    resolve();
  }
}, DEBOUNCE_MS);
});
};
