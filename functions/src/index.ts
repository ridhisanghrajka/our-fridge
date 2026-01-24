import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

const db = admin.firestore();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// CALM RULES
const INACTIVITY_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours
const RECENT_ACTIVITY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function sendPushNotification(token: string, title: string, body: string) {
  try {
    await axios.post(EXPO_PUSH_URL, {
      to: token,
      title: title,
      body: body,
      sound: "default",
    });
    console.log(`Notification sent to ${token}: ${title}`);
  } catch (error) {
    console.error("Error sending push notification:", error);
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

    const { pairId, createdBy } = itemData;
    if (!pairId) return;

    // Get all users in the pair
    const usersRef = db.collection("pairs").doc(pairId).collection("users");
    const usersSnapshot = await usersRef.get();

    const now = admin.firestore.Timestamp.now();

    const promises = usersSnapshot.docs.map(async (doc) => {
      // doc.id is the userName
      if (doc.id === createdBy) return; // Skip the person who added it

      const userData = doc.data();
      if (!userData.pushToken || !userData.prefs?.notifyFridgeUpdates) return;

      const lastSeenAt = userData.lastSeenAt?.toMillis() || 0;
      const lastNotifAt = userData.lastNotifAt?.fridgeUpdated?.toMillis() || 0;
      const timeSinceSeen = now.toMillis() - lastSeenAt;
      const timeSinceNotif = now.toMillis() - lastNotifAt;

      // CALM LOGIC: 
      // 1. Only notify if recipient hasn't been active for > 12h
      // 2. AND hasn't received a fridge update in > 12h
      // 3. AND isn't currently active (seen > 10m ago)
      if (timeSinceSeen > INACTIVITY_WINDOW_MS && 
          timeSinceNotif > INACTIVITY_WINDOW_MS &&
          timeSinceSeen > RECENT_ACTIVITY_WINDOW_MS) {
        
        await sendPushNotification(
          userData.pushToken,
          "The fridge was updated",
          "There are new items on the list"
        );

        // Update lastNotifAt
        await doc.ref.update({
          "lastNotifAt.fridgeUpdated": now
        });
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
