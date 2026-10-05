import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();

const revenueCatWebhookAuth = defineSecret("REVENUECAT_WEBHOOK_AUTH");

const openai = new OpenAI({
  apiKey: functions.config().openai.key
});

const db = admin.firestore();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// CALM RULES
const INACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const RECENT_ACTIVITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function sendPushNotification(token: string, title: string, body: string, data?: any, isSilent: boolean = false) {
  try {
    const payload: any = {
      to: token,
      data: data || {},
    };

    if (!isSilent) {
      payload.title = title;
      payload.body = body;
      payload.sound = "default";
    } else {
      // Use _contentAvailable for Headless Background Notifications as per Expo docs.
      // We use priority: high to ensure iOS grants the background wake (waking: 1).
      payload._contentAvailable = true;
      payload.priority = "high";
    }

    const response = await axios.post(EXPO_PUSH_URL, payload);

    console.log(`Push sent | Silent: ${isSilent} | Token: ${token.substring(0, 20)}... | Type: ${data?.type}`);

    const receipt = Array.isArray(response.data?.data) ? response.data.data?.[0] : response.data?.data;
    if (receipt?.status === "error") {
      console.log(`Expo error: ${receipt.message}`);
      if (receipt.details?.error === "DeviceNotRegistered") {
        return "REMOVE_TOKEN";
      }
    }
    
    return "SUCCESS";
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    if (error.response?.status === 400) {
      return "REMOVE_TOKEN";
    }
    return "ERROR";
  }
}

/**
 * Trigger: When a grocery item is added
 * Bulk adds (from recipes) are tagged with isBulkAdd and handled by sendBulkAddNotification instead.
 */
export const onItemAdded = functions.firestore
  .document("groceryItems/{itemId}")
  .onCreate(async (snapshot) => {
    const itemData = snapshot.data();
    if (!itemData) return;

    if (itemData.isBulkAdd) return;

    const { pairId, createdBy, name: itemName } = itemData;
    if (!pairId) return;

    // Get all users in the pair
    const usersRef = db.collection("pairs").doc(pairId).collection("users");
    const usersSnapshot = await usersRef.get();

    const now = admin.firestore.Timestamp.now();

    const promises = usersSnapshot.docs.map(async (doc) => {
      // doc.id is the userName or userId (based on how it was saved)
      // Actually, looking at the code, doc.id is userId
      const userData = doc.data();
      
      // Skip the person who added it
      // Compare userId if available, otherwise fallback to name comparison
      if (userData.userId === itemData.userId || doc.id === itemData.userId) {
        return;
      }

      if (!userData.pushToken || !userData.prefs?.notifyFridgeUpdates) {
        return;
      }

      const lastSeenAt = userData.lastSeenAt?.toMillis() || 0;
      const lastNotifAt = userData.lastNotifAt?.fridgeUpdated?.toMillis() || 0;
      const timeSinceSeen = now.toMillis() - lastSeenAt;
      const timeSinceNotif = now.toMillis() - lastNotifAt;

      // CALM LOGIC: 
      // 1. Only notify if recipient hasn't been active for > 30m
      // 2. AND hasn't received a fridge update in > 30m
      // 3. AND isn't currently active (seen > 10m ago)
      if (timeSinceSeen > INACTIVITY_WINDOW_MS && 
          timeSinceNotif > INACTIVITY_WINDOW_MS &&
          timeSinceSeen > RECENT_ACTIVITY_WINDOW_MS) {
        await sendPushNotification(
          userData.pushToken,
          "New fridge item!",
          `${createdBy} added ${itemName} to the list.`,
          { screen: "GroceryList", type: "WIDGET_UPDATE" }
        );

        await sendPushNotification(
          userData.pushToken,
          "",
          "",
          { type: "WIDGET_UPDATE" },
          true
        );

        // Update lastNotifAt
        await doc.ref.update({
          "lastNotifAt.fridgeUpdated": now
        });
      } else {
        // SILENT UPDATE: If they are active or recently notified, just update the widget silently
        await sendPushNotification(
          userData.pushToken,
          "",
          "",
          { type: "WIDGET_UPDATE" },
          true
        );
      }
    });

    await Promise.all(promises);
  });

/**
 * Trigger: When a grocery item is updated (toggle done, rename, quantity, image upload, etc.)
 * Sends a silent widget refresh to other members so their widgets update quickly.
 */
export const onItemUpdated = functions.firestore
  .document("groceryItems/{itemId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after) return;

    const pairId = after.pairId;
    if (!pairId) return;

    // Best-effort actor detection (client should write this field)
    const updatedByUid = after.updatedByUid || after.updatedByUserId || null;

    // Get all users in the pair
    const usersRef = db.collection("pairs").doc(pairId).collection("users");
    const usersSnapshot = await usersRef.get();

    const promises = usersSnapshot.docs.map(async (doc) => {
      const userData = doc.data();

      // Skip the person who updated it (if we can detect them)
      const isSender = !!updatedByUid && (userData.userId === updatedByUid || doc.id === updatedByUid);
      const hasToken = !!userData.pushToken;
      // Default to "enabled" if prefs are missing (older docs)
      const notifyEnabled = userData.prefs?.notifyFridgeUpdates !== false;

      if (isSender) return;
      if (!hasToken) return;
      if (!notifyEnabled) return;

      await sendPushNotification(
        userData.pushToken,
        "",
        "",
        { type: "WIDGET_UPDATE" },
        true
      );
    });

    await Promise.all(promises);
  });

/**
 * Trigger: When a grocery item is deleted
 * Sends a silent widget refresh so the removed item disappears promptly.
 */
export const onItemDeleted = functions.firestore
  .document("groceryItems/{itemId}")
  .onDelete(async (snapshot) => {
    const itemData = snapshot.data();
    if (!itemData) return;

    const pairId = itemData.pairId;
    if (!pairId) return;

    const usersRef = db.collection("pairs").doc(pairId).collection("users");
    const usersSnapshot = await usersRef.get();

    const promises = usersSnapshot.docs.map(async (doc) => {
      const userData = doc.data();
      if (!userData.pushToken || !userData.prefs?.notifyFridgeUpdates) return;

      await sendPushNotification(
        userData.pushToken,
        "",
        "",
        { type: "WIDGET_UPDATE" },
        true
      );
    });

    await Promise.all(promises);
  });

/**
 * Callable: Single consolidated notification for bulk add (e.g. "Add All Ingredients")
 */
export const sendBulkAddNotification = functions.https.onCall(async (data, context) => {
  const { pairId, addedBy, addedByUid, count, recipeName } = data;
  if (!pairId || !count) return;

  const usersRef = db.collection("pairs").doc(pairId).collection("users");
  const usersSnapshot = await usersRef.get();

  const now = admin.firestore.Timestamp.now();

  const promises = usersSnapshot.docs.map(async (doc) => {
    const userData = doc.data();

    if (userData.userId === addedByUid || doc.id === addedByUid) return;
    if (!userData.pushToken || !userData.prefs?.notifyFridgeUpdates) return;

    const lastSeenAt = userData.lastSeenAt?.toMillis() || 0;
    const lastNotifAt = userData.lastNotifAt?.fridgeUpdated?.toMillis() || 0;
    const timeSinceSeen = now.toMillis() - lastSeenAt;
    const timeSinceNotif = now.toMillis() - lastNotifAt;

    if (timeSinceSeen > INACTIVITY_WINDOW_MS &&
        timeSinceNotif > INACTIVITY_WINDOW_MS &&
        timeSinceSeen > RECENT_ACTIVITY_WINDOW_MS) {
      const body = recipeName
        ? `${addedBy} added ${count} items from ${recipeName}.`
        : `${addedBy} added ${count} items to the list.`;

      await sendPushNotification(
        userData.pushToken,
        "New fridge items!",
        body,
        { screen: "GroceryList", type: "WIDGET_UPDATE" }
      );

      await sendPushNotification(
        userData.pushToken,
        "",
        "",
        { type: "WIDGET_UPDATE" },
        true
      );

      await doc.ref.update({ "lastNotifAt.fridgeUpdated": now });
    } else {
      await sendPushNotification(
        userData.pushToken,
        "",
        "",
        { type: "WIDGET_UPDATE" },
        true
      );
    }
  });

  await Promise.all(promises);
});

const NOTE_NOTIFY_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function parseNoteElements(content: unknown): { id: string; type: string }[] {
  try {
    const parsed = JSON.parse(typeof content === "string" ? content : "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Trigger: When a shared note is updated
 * Always refreshes partners' widgets silently. When something new was added (not erased),
 * also sends a visible "drew you something" / "left you a note" alert, at most every 10 minutes.
 */
export const onNoteUpdated = functions.firestore
  .document("sharedNotes/{pairId}")
  .onWrite(async (change, context) => {
    const pairId = context.params.pairId;
    const noteData = change.after.data();
    if (!noteData) return;

    const beforeIds = new Set(parseNoteElements(change.before.data()?.content).map((el) => el.id));
    const added = parseNoteElements(noteData.content).filter((el) => !beforeIds.has(el.id));
    const senderName = noteData.updatedBy || "Your partner";
    let alertBody: string | null = null;
    if (added.some((el) => el.type === "path")) alertBody = `${senderName} drew you something ✏️`;
    else if (added.some((el) => el.type === "text")) alertBody = `${senderName} left you a note 💌`;
    else if (added.some((el) => el.type === "magnet")) alertBody = `${senderName} stuck a magnet on your fridge 🧲`;

    // Get all users in the pair
    const usersRef = db.collection("pairs").doc(pairId).collection("users");
    const usersSnapshot = await usersRef.get();
    const now = admin.firestore.Timestamp.now();

    const promises = usersSnapshot.docs.map(async (doc) => {
      const userData = doc.data();

      // Skip the person who updated it
      if (userData.userId === noteData.updatedByUid || doc.id === noteData.updatedByUid) return;
      if (!userData.pushToken) return;

      const lastNoteNotifAt = userData.lastNotifAt?.note?.toMillis() || 0;
      const wantsNoteAlerts = userData.prefs?.notifyNotes !== false;
      if (alertBody && wantsNoteAlerts && now.toMillis() - lastNoteNotifAt > NOTE_NOTIFY_COOLDOWN_MS) {
        await sendPushNotification(
          userData.pushToken,
          "Our Fridge",
          alertBody,
          { screen: "GroceryList", type: "WIDGET_UPDATE" }
        );
        await doc.ref.update({ "lastNotifAt.note": now });
      }

      // Always send a silent update for notes to keep the widget fresh
      await sendPushNotification(
        userData.pushToken,
        "",
        "",
        { type: "WIDGET_UPDATE" },
        true
      );
    });

    await Promise.all(promises);
  });

/**
 * A fridge is premium while any of its members has an active subscription.
 */
async function syncFridgePremium(fridgeId: string) {
  const fridgeRef = db.collection("pairs").doc(fridgeId);
  const fridgeSnap = await fridgeRef.get();
  if (!fridgeSnap.exists) return;

  const memberUids: string[] = fridgeSnap.data()?.memberUids || [];
  const memberDocs = await Promise.all(memberUids.map((uid) => db.collection("users").doc(uid).get()));
  const anyPremium = memberDocs.some((doc) => doc.exists && doc.data()?.isPremium === true);

  if ((fridgeSnap.data()?.isPremiumEnabled === true) !== anyPremium) {
    await fridgeRef.update({ isPremiumEnabled: anyPremium });
    console.log(`Fridge ${fridgeId} premium -> ${anyPremium}`);
  }
}

async function setUserPremium(uid: string, isPremium: boolean) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    console.log(`User ${uid} not found`);
    return;
  }
  await userRef.update({ isPremium });
  const fridgeId = userSnap.data()?.fridgeId;
  if (fridgeId) await syncFridgePremium(fridgeId);
}

/**
 * Trigger: When a fridge's members change
 * Recomputes the fridge's premium status and tells existing members when someone joins.
 */
export const onMembersChanged = functions.firestore
  .document("pairs/{pairId}")
  .onUpdate(async (change, context) => {
    const pairId = context.params.pairId;
    const before: string[] = change.before.data()?.memberUids || [];
    const after: string[] = change.after.data()?.memberUids || [];
    const joined = after.filter((uid) => !before.includes(uid));
    const left = before.filter((uid) => !after.includes(uid));
    if (joined.length === 0 && left.length === 0) return;

    await syncFridgePremium(pairId);
    if (joined.length === 0) return;

    const memberNames = change.after.data()?.memberNames || {};
    const joinerName = memberNames[joined[0]] || "Your partner";

    const usersSnapshot = await db.collection("pairs").doc(pairId).collection("users").get();
    const promises = usersSnapshot.docs.map(async (doc) => {
      if (joined.includes(doc.id)) return;
      const userData = doc.data();
      if (!userData.pushToken) return;

      await sendPushNotification(
        userData.pushToken,
        `${joinerName} joined your fridge 🎉`,
        "Your grocery list and notes now sync between you.",
        { screen: "GroceryList", type: "WIDGET_UPDATE" }
      );
    });

    await Promise.all(promises);
  });

// RevenueCat events that mean the subscriber has access / has lost it.
// CANCELLATION only turns off auto-renew: access continues until EXPIRATION.
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
const REVOKE_EVENTS = new Set(["EXPIRATION"]);

/**
 * Trigger: RevenueCat Webhook for subscription events
 * The only writer of premium status. RevenueCat must send the shared secret
 * as the Authorization header (set in RevenueCat > Integrations > Webhooks).
 */
export const onSubscriptionUpdated = functions
  .runWith({ secrets: [revenueCatWebhookAuth] })
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    if (req.headers.authorization !== `Bearer ${revenueCatWebhookAuth.value()}`) {
      res.status(401).send("Unauthorized");
      return;
    }

    const event = req.body?.event;
    if (!event?.type) {
      res.status(400).send("Missing event");
      return;
    }

    console.log(`Received RevenueCat event ${event.type} for user ${event.app_user_id}`);

    try {
      if (event.type === "TRANSFER") {
        await Promise.all([
          ...(event.transferred_from || []).map((uid: string) => setUserPremium(uid, false)),
          ...(event.transferred_to || []).map((uid: string) => setUserPremium(uid, true)),
        ]);
      } else if (GRANT_EVENTS.has(event.type)) {
        await setUserPremium(event.app_user_id, true);
      } else if (REVOKE_EVENTS.has(event.type)) {
        await setUserPremium(event.app_user_id, false);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing RevenueCat webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  });

/**
 * HTTP Function to scrape a recipe from a URL
 */
export const scrapeRecipe = functions.https.onRequest(async (req, res) => {
  // 1. Basic Security/Method Check
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { url } = req.body;
  if (!url) {
    res.status(400).send('URL is required');
    return;
  }

  try {
    // 2. Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);

    // 3. Find JSON-LD
    let recipeData: any = null;
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const content = $(element).html();
        if (!content) return;
        
        const json = JSON.parse(content);
        
        // Helper to find Recipe in an object or array
        const findRecipe = (obj: any): any => {
          if (!obj) return null;
          
          // Case 1: Direct Recipe object
          if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
            return obj;
          }
          
          // Case 2: Array of objects
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findRecipe(item);
              if (found) return found;
            }
          }
          
          // Case 3: @graph object
          if (obj['@graph'] && Array.isArray(obj['@graph'])) {
            return findRecipe(obj['@graph']);
          }
          
          return null;
        };

        const found = findRecipe(json);
        if (found) {
          recipeData = found;
          return false; // break loop
        }
      } catch (e) {
        // skip malformed JSON
      }
    });

    if (!recipeData) {
      res.status(404).send('No recipe data found on this page');
      return;
    }

    // 4. Map to lean format
    // Helper to extract image URL
    const extractImage = (img: any): string | undefined => {
      if (typeof img === 'string') return img;
      if (Array.isArray(img)) return extractImage(img[0]);
      if (img && typeof img === 'object') return img.url || img.contentUrl;
      return undefined;
    };

    const rawIngredients = recipeData.recipeIngredient || [];
    let parsedIngredients = [];

    if (rawIngredients.length > 0) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `You are a grocery-focused recipe ingredient parser.
Convert raw ingredient strings into a clean JSON array.

OUTPUT FORMAT:
{"ingredients": [{"name": "item name", "quantity": "amount"}]}

STRICT PARSING RULES:
1. NORMALIZE UNITS: 
   - Change "teaspoon", "teaspoons", "tsp.", "t." -> "tsp"
   - Change "tablespoon", "tablespoons", "tbsp.", "T." -> "tbsp"
   - This applies to the "quantity" field.

2. FILTERING (CRITICAL):
   - REMOVE these ingredients entirely: "water", "ice".
   - If an ingredient is just "water", do not include it in the JSON.

3. CLEANING NAMES:
   - In the "name" field, keep ONLY the item to be bought.
   - Remove prep words: "chopped", "minced", "melted", "divided", "peeled", "beaten", "crushed".
   - Remove non-essential adjectives: "fresh", "organic", "large", "small", "freshly ground".
   - Example: "2 cups fresh organic spinach, chopped" -> {"name": "spinach", "quantity": "2 cups"}

4. QUANTITY:
   - Keep numbers and units (e.g., "1/2 cup", "2 lbs", "300g").
   - If no quantity, use "".

Double-check: Ensure NO "teaspoon" or "water" remains in the final JSON.`
            },
            {
              role: "user",
              content: JSON.stringify(rawIngredients)
            }
          ],
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        const parsedContent = JSON.parse(content || '{"ingredients": []}');
        parsedIngredients = parsedContent.ingredients || [];
      } catch (aiError: any) {
        console.error('AI Parsing Error:', aiError.message);
        // Remove fallback logic to ensure we only use the AI prompt results
        res.status(500).send(`AI Parsing failed: ${aiError.message}`);
        return;
      }
    }

    const result = {
      name: recipeData.name || $('title').text() || 'Imported Recipe',
      ingredients: parsedIngredients,
      imageUrl: extractImage(recipeData.image)
    };

    res.status(200).json(result);

  } catch (error: any) {
    console.error('Scrape Error:', error.message);
    res.status(500).send(`Failed to parse recipe: ${error.message}`);
  }
});
