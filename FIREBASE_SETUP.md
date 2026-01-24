# Firebase Setup Guide for Our Fridge

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `our-fridge` (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click "Create project"

## Step 2: Add Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Register app with nickname: "Our Fridge Mobile"
3. Don't check "Firebase Hosting"
4. Click "Register app"
5. **Copy the firebaseConfig object** - you'll need this!

## Step 3: Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database" in the left menu
2. Click "Create database"
3. Select "Start in production mode"
4. Choose a Cloud Firestore location (choose one closest to your users)
5. Click "Enable"

## Step 4: Configure Firestore Security Rules

1. Go to "Firestore Database" → "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Pairs collection - anyone can read/write
    match /pairs/{pairId} {
      allow read, write: if true;
    }
    
    // Grocery items - anyone can read/write
    match /groceryItems/{itemId} {
      allow read, write: if true;
    }
    
    // Shared notes - anyone can read/write
    match /sharedNotes/{noteId} {
      allow read, write: if true;
    }
  }
}
```

## Step 5: Set Up Firebase Storage

1. In Firebase Console, go to "Storage" in the left menu
2. Click "Get started"
3. Click "Next" and "Done"
4. Go to the "Rules" tab and replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /grocery-items/{allPaths=**} {
      allow read, write: if true;
    }
    match /profile_images/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

5. Click "Publish"

## Step 6: Update App Configuration

1. Open `firebase.config.ts` in your project
2. Replace the placeholder values with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "AIza...",              // From Firebase Console
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 6: Test the Connection

1. Start your Expo app:
```bash
npx expo start
```

2. Open on your device/simulator
3. Try creating a new fridge
4. Check Firebase Console → Firestore Database to see if a new document was created in the `pairs` collection

## Firestore Collections Structure

Your database will have three collections:

### `pairs`
```
{
  id: "123456" (document ID is the pairing code)
  userAName: "Alice"
  userBName: "Bob"
  createdAt: Timestamp
}
```

### `groceryItems`
```
{
  id: auto-generated
  pairId: "123456"
  name: "Milk"
  emoji: "🥛"
  quantity: "2L"
  isDone: false
  createdBy: "Alice"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `sharedNotes`
```
{
  id: "123456" (same as pairId)
  pairId: "123456"
  text: "Don't forget the eggs!"
  updatedAt: Timestamp
  updatedBy: "Bob"
}
```

## Troubleshooting

### "Permission denied" errors
- Check that your Firestore security rules are published correctly
- Make sure you're using production mode, not test mode

### "Firebase not initialized" errors
- Verify your `firebase.config.ts` has the correct credentials
- Make sure all fields are filled in (no "YOUR_" placeholders)

### Items not syncing
- Check your internet connection
- Verify Firestore rules allow read/write
- Check Firebase Console → Firestore Database to see if data is being written

## Next Steps

Once Firebase is set up:
1. Test pairing between two devices
2. Add some grocery items
3. Toggle items as done/undone
4. Write shared notes
5. Verify real-time sync is working!
