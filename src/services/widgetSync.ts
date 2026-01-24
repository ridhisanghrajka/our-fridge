import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { NativeModules, Platform } from 'react-native';
import { GroceryItem } from '../types/GroceryItem';
import { SharedNote, CanvasElement } from '../types/SharedNote';

const { WidgetBridge } = NativeModules;
const APP_GROUP = 'group.com.ridhisanghrajka.ourfridge';

export interface WidgetSnapshot {
  fridgeName: string;
  items: string[];
  noteSnippet: string;
  noteElements: CanvasElement[];
  updatedAt: number;
  isLocked: boolean;
}

/**
 * Syncs the current fridge state to the iOS widget shared storage.
 */
export const syncDataToWidget = async (
  items: GroceryItem[],
  note: SharedNote | null,
  fridgeName: string = "Our Fridge",
  isPremium: boolean = false,
  trialStartedAt: Date | null = null
) => {
  try {
    // Check if trial is expired
    const trialExpired = trialStartedAt ? (Date.now() - trialStartedAt.getTime()) > 7 * 24 * 60 * 60 * 1000 : false;
    const isLocked = trialExpired && !isPremium;

    // 1. Prepare items
    let activeItems: string[] = [];
    let noteSnippet = "No notes yet";
    let noteElements: CanvasElement[] = [];

    if (isLocked) {
      fridgeName = "Fridge Paused";
      activeItems = ["Open app to continue"];
      noteSnippet = "Your fridge is paused. Subscribe to keep sharing moments.";
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

    // 3. Save to shared group preferences
    await SharedGroupPreferences.setItem('widgetData', snapshot, APP_GROUP);
    console.log("Widget data synced successfully");

    // 4. Prompt iOS to refresh the widget
    if (Platform.OS === 'ios' && WidgetBridge?.reloadWidget) {
      WidgetBridge.reloadWidget();
    }
  } catch (error) {
    // This will likely fail until the native module is installed and app is prebuilt
    console.log("Widget sync failed (expected if not on native/ios):", error);
  }
};
