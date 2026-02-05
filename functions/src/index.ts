import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

admin.initializeApp();

const openai = new OpenAI({
  apiKey: functions.config().openai.key
});

const db = admin.firestore();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// CALM RULES
const INACTIVITY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const RECENT_ACTIVITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function sendPushNotification(token: string, title: string, body: string, data?: any) {
  try {
    const response = await axios.post(EXPO_PUSH_URL, {
      to: token,
      title: title,
      body: body,
      data: data,
      sound: "default",
    });

    const receipt = response.data.data?.[0];
    if (receipt?.status === "error") {
      console.log(`Expo error: ${receipt.message}`);
      if (receipt.details?.error === "DeviceNotRegistered") {
        return "REMOVE_TOKEN";
      }
    }
    
    console.log(`Notification sent to ${token}: ${title}`);
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
 */
export const onItemAdded = functions.firestore
  .document("groceryItems/{itemId}")
  .onCreate(async (snapshot) => {
    const itemData = snapshot.data();
    if (!itemData) return;

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
      if (userData.userId === itemData.userId || doc.id === itemData.userId) return;

      if (!userData.pushToken || !userData.prefs?.notifyFridgeUpdates) return;

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
        
        const result = await sendPushNotification(
          userData.pushToken,
          "New fridge item!",
          `${createdBy} added ${itemName} to the list.`,
          { screen: "GroceryList" }
        );

        if (result === "REMOVE_TOKEN") {
          console.log(`Cleaning up dead token for user ${doc.id}`);
          await doc.ref.update({
            pushToken: admin.firestore.FieldValue.delete()
          });
        } else if (result === "SUCCESS") {
          // Update lastNotifAt
          await doc.ref.update({
            "lastNotifAt.fridgeUpdated": now
          });
        }
      }
    });

    await Promise.all(promises);
  });

/**
 * Trigger: RevenueCat Webhook for subscription events
 * This updates the user and fridge premium status
 */
export const onSubscriptionUpdated = functions.https.onRequest(async (req, res) => {
  // 1. Verify the request comes from RevenueCat (you should check the authorization header)
  // const authToken = req.headers.authorization;
  // if (authToken !== `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN}`) {
  //   return res.status(401).send("Unauthorized");
  // }

  const event = req.body.event;
  const uid = event.app_user_id;
  const type = event.type;

  console.log(`Received RevenueCat event ${type} for user ${uid}`);

  try {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.log(`User ${uid} not found`);
      res.status(200).send("User not found");
      return;
    }

    const userData = userSnap.data();
    const isPremiumEvent = type === "INITIAL_PURCHASE" || type === "RENEWAL" || type === "RESTORE";
    const isLossOfEntitlement = type === "CANCELLATION" || type === "EXPIRATION" || type === "REFUND";

    if (isPremiumEvent) {
      // Set user as premium
      await userRef.update({ isPremium: true });

      // Find the fridge and update it
      if (userData?.fridgeId) {
        await db.collection("pairs").doc(userData.fridgeId).update({
          isPremiumEnabled: true
        });
      }
    } else if (isLossOfEntitlement) {
      // Remove user premium status
      await userRef.update({ isPremium: false });

      // Check if any other member in the fridge is premium
      if (userData?.fridgeId) {
        const fridgeRef = db.collection("pairs").doc(userData.fridgeId);
        const fridgeSnap = await fridgeRef.get();
        
        if (fridgeSnap.exists) {
          const fridgeData = fridgeSnap.data();
          const memberUids = fridgeData?.memberUids || [];
          
          // Fetch all members to see if any are still premium
          const memberDocs = await Promise.all(
            memberUids.map((memberUid: string) => db.collection("users").doc(memberUid).get())
          );
          
          const anyPremium = memberDocs.some(doc => doc.exists && doc.data()?.isPremium === true);
          
          if (!anyPremium) {
            await fridgeRef.update({ isPremiumEnabled: false });
            console.log(`Relocked fridge ${userData.fridgeId}`);
          }
        }
      }
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
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
