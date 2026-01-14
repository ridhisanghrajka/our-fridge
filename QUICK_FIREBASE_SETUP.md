# Quick Firebase Setup Checklist

## ✅ What You Need to Do

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Click on your project: **our-fridge-5b835**

### Step 2: Create Firestore Database (CRITICAL!)
1. In the left sidebar, click **"Firestore Database"**
2. If you see a button that says **"Create database"**, click it
3. Choose **"Start in production mode"**
4. Select a location (any location is fine, choose closest to you)
5. Click **"Enable"**

### Step 3: Set Security Rules
1. After the database is created, click the **"Rules"** tab at the top
2. Replace ALL the text with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pairs/{pairId} {
      allow read, write: if true;
    }
    
    match /groceryItems/{itemId} {
      allow read, write: if true;
    }
    
    match /sharedNotes/{noteId} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"** button

### Step 4: Test the App
1. Reload your app in Expo (press 'r' in the terminal or shake your phone and tap "Reload")
2. Try creating a new fridge again
3. Check the terminal/console for any error messages

## How to Check if Firestore is Set Up

1. Go to Firebase Console → Firestore Database
2. You should see tabs: "Data", "Rules", "Indexes", "Usage"
3. If you only see a "Create database" button, **Firestore is NOT set up yet**

## Common Errors

**"Missing or insufficient permissions"**
→ Security rules not set correctly. Go back to Step 3.

**"Failed to get document"**
→ Firestore database not created. Go back to Step 2.

**No error message, just stuck**
→ Check the Expo terminal for console.log messages

## After Setup

Once Firestore is working:
1. When you create a fridge, you should see a 6-digit code
2. Check Firebase Console → Firestore Database → Data tab
3. You should see a new document in the "pairs" collection
