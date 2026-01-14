# Our Fridge - Shared Grocery List App

A cozy mobile app for couples to share a grocery list and notes in real-time, built with Expo and Firebase.

## Features

- 🔗 **Easy Pairing**: Connect with your partner using a simple 6-digit code
- 📝 **Shared Grocery List**: Add items with emojis and quantities
- ✅ **Real-time Sync**: Changes appear instantly on both devices
- 📌 **Shared Notes**: Write notes for your partner
- 🎨 **Beautiful Design**: Cozy, notepad-style interface with fridge theme

## Setup Instructions

### 1. Install Dependencies

```bash
cd OurFridge
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing one)
3. Add a web app to your project
4. Copy the Firebase configuration

5. Create Firestore Database:
   - Go to Firestore Database in Firebase Console
   - Click "Create database"
   - Start in **production mode**
   - Choose a location

6. Set up Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write to pairs
    match /pairs/{pairId} {
      allow read, write: if true;
    }
    
    // Allow read/write to grocery items
    match /groceryItems/{itemId} {
      allow read, write: if true;
    }
    
    // Allow read/write to shared notes
    match /sharedNotes/{noteId} {
      allow read, write: if true;
    }
  }
}
```

7. Update `firebase.config.ts` with your Firebase credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Run the App

```bash
# Start Expo
npx expo start

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on your phone
```

## Testing Real-time Sync

To test the real-time sync feature:

1. **Option 1**: Use two physical devices
   - Install Expo Go on both phones
   - Scan the QR code on both devices
   - Create a fridge on one device
   - Join with the pairing code on the other

2. **Option 2**: Use simulator + physical device
   - Run on iOS simulator: `npx expo start --ios`
   - Scan QR code with Expo Go on your phone

## Project Structure

```
OurFridge/
├── src/
│   ├── types/          # TypeScript interfaces
│   ├── services/       # Firebase and pairing services
│   ├── hooks/          # Custom React hooks
│   ├── screens/        # App screens
│   ├── components/     # Reusable components
│   ├── navigation/     # Navigation setup
│   └── assets/         # SVG assets
├── firebase.config.ts  # Firebase configuration
└── App.tsx            # App entry point
```

## How to Use

1. **First User**: 
   - Enter your name
   - Tap "Create New Fridge"
   - Share the 6-digit code with your partner

2. **Second User**:
   - Enter your name
   - Enter the pairing code
   - Tap "Join Fridge"

3. **Add Items**:
   - Tap "Add Item" button
   - Enter item name, emoji (optional), and quantity (optional)
   - Tap "Save"

4. **Check Off Items**:
   - Tap the checkbox next to an item
   - Checked items move to the bottom and appear faded

5. **Write Notes**:
   - Tap "Write Note" button or tap the note area
   - Write a message for your partner
   - Tap "Save"

## Technologies Used

- **Expo** - React Native framework
- **TypeScript** - Type safety
- **Firebase Firestore** - Real-time database
- **React Navigation** - Navigation
- **React Native SVG** - SVG rendering

## License

MIT
