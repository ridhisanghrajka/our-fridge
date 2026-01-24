import firebase from 'firebase/compat/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    OAuthProvider, 
    signInWithCredential 
} from 'firebase/auth';
import { db, auth } from '../../firebase.config';

import { Pair } from '../types/Pair';
import { User } from '../types/User';

const PAIR_ID_KEY = '@OurFridge:pairId';
const USER_NAME_KEY = '@OurFridge:userName';

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email: string, password: string, name: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create the user document in Firestore with email
    const userData = await createUser(firebaseUser.uid, email);
    // Update with the provided name
    await updateUser(firebaseUser.uid, { name });
    
    return { ...userData, name, email };
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    const userData = await getUser(firebaseUser.uid);
    if (!userData) {
        // This shouldn't happen with email sign in, but let's be safe
        return await createUser(firebaseUser.uid);
    }
    return userData;
};

/**
 * Sign in with Apple credential
 */
export const signInWithAppleCredential = async (identityToken: string, nonce: string, fullName?: string, email?: string): Promise<User> => {
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
    });
    
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;
    
    let userData = await getUser(firebaseUser.uid);
    if (!userData) {
        // Create user with email if provided by Apple
        userData = await createUser(firebaseUser.uid, email || firebaseUser.email || null);
        
        // If Apple provided a name (only happens on first sign-in), save it
        if (fullName) {
            await updateUser(firebaseUser.uid, { name: fullName });
            userData.name = fullName;
        }
    } else if (email && !userData.email) {
        // If we have an email now but didn't before, update it
        await updateUser(firebaseUser.uid, { email });
        userData.email = email;
    }
    return userData;
};

/**
 * Generate a random 6-digit pairing code
 */
export const generatePairingCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Get user data from Firestore
 */
export const getUser = async (uid: string): Promise<User | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            uid: userSnap.id,
            email: data.email || null,
            name: data.name,
            isPremium: data.isPremium || false,
            trialStartedAt: data.trialStartedAt?.toDate() || null,
            fridgeId: data.fridgeId || null,
            photoURL: data.photoURL || null,
            createdAt: data.createdAt?.toDate() || new Date(),
        };
    }
    return null;
};

/**
 * Create a new user in Firestore
 */
export const createUser = async (uid: string, email: string | null = null): Promise<User> => {
    const userRef = doc(db, 'users', uid);
    const newUser: User = {
        uid,
        email,
        name: null,
        isPremium: false,
        trialStartedAt: null,
        fridgeId: null,
        photoURL: null,
        createdAt: new Date(),
    };
    await setDoc(userRef, {
        ...newUser,
        createdAt: Timestamp.fromDate(newUser.createdAt),
    });
    return newUser;
};

/**
 * Update user data in Firestore
 */
export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    const updateData: any = { ...data };
    if (data.trialStartedAt) {
        updateData.trialStartedAt = Timestamp.fromDate(data.trialStartedAt);
    }
    if (data.createdAt) {
        updateData.createdAt = Timestamp.fromDate(data.createdAt);
    }
    await updateDoc(userRef, updateData);
    if (data.name) {
        await AsyncStorage.setItem(USER_NAME_KEY, data.name);
    }
};

/**
 * Update user photo in both user document and pair document
 */
export const updateUserPhoto = async (uid: string, pairId: string | null, photoURL: string): Promise<void> => {
    // 1. Update user document
    await updateUser(uid, { photoURL });

    // 2. Update pair document if user is in a fridge
    if (pairId) {
        const pairRef = doc(db, 'pairs', pairId);
        await updateDoc(pairRef, {
            [`memberPhotos.${uid}`]: photoURL
        });
    }
};

/**
 * Create a new fridge (pair)
 */
export const createPair = async (code: string, userId: string, userName: string, fridgeName: string): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);

    // Check if pair already exists
    const pairSnap = await getDoc(pairRef);
    if (pairSnap.exists()) {
        throw new Error('This pairing code already exists. Please try another one.');
    }

    // Create new pair
    const newPair: Omit<Pair, 'id'> = {
        memberUids: [userId],
        memberNames: { [userId]: userName },
        memberPhotos: {},
        fridgeName: fridgeName || `${userName}'s Fridge`,
        isPremiumEnabled: false, // Will be updated by Cloud Function or check
        createdAt: new Date(),
    };

    await setDoc(pairRef, {
        ...newPair,
        createdAt: Timestamp.fromDate(newPair.createdAt),
    });

    // Update user's fridgeId
    await updateUser(userId, { fridgeId: code, name: userName });

    // Save to local storage
    await AsyncStorage.setItem(PAIR_ID_KEY, code);
};

/**
 * Join an existing fridge
 */
export const joinPair = async (code: string, userId: string, userName: string): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);

    // Check if pair exists
    const pairSnap = await getDoc(pairRef);
    if (!pairSnap.exists()) {
        throw new Error('Pairing code not found. Please check and try again.');
    }

    const pairData = pairSnap.data() as Pair;

    // Check if pair is already full
    if (pairData.memberUids && pairData.memberUids.length >= 4) {
        throw new Error('This fridge is already full (max 4 members).');
    }

    // Update pair with new user
    await updateDoc(pairRef, {
        memberUids: arrayUnion(userId),
        [`memberNames.${userId}`]: userName,
        [`memberPhotos.${userId}`]: null
    });

    // Update user's fridgeId
    await updateUser(userId, { fridgeId: code, name: userName });

    // Save to local storage
    await AsyncStorage.setItem(PAIR_ID_KEY, code);
};

/**
 * Leave a fridge
 */
export const leaveFridge = async (code: string, userId: string): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);
    const pairSnap = await getDoc(pairRef);
    
    if (!pairSnap.exists()) return;
    
    const pairData = pairSnap.data() as Pair;
    const remainingMembers = pairData.memberUids.filter(uid => uid !== userId);
    
    if (remainingMembers.length === 0) {
        // Delete the fridge if last person leaves
        await deleteDoc(pairRef);
        // Also delete items and notes? (Plan says: "Delete the fridge document and all its grocery items/notes immediately")
        // TODO: Implement deletion of items/notes in a Cloud Function or here
    } else {
        // Remove member
        const updates: any = {
            memberUids: arrayRemove(userId)
        };
        // Remove from memberNames as well
        const newMemberNames = { ...pairData.memberNames };
        delete newMemberNames[userId];
        updates.memberNames = newMemberNames;

        const newMemberPhotos = { ...(pairData.memberPhotos || {}) };
        delete newMemberPhotos[userId];
        updates.memberPhotos = newMemberPhotos;
        
        await updateDoc(pairRef, updates);
    }

    // Update user's fridgeId
    await updateUser(userId, { fridgeId: null });

    // Clear local storage
    await AsyncStorage.removeItem(PAIR_ID_KEY);
};

/**
 * Update the fridge name
 */
export const updateFridgeName = async (code: string, fridgeName: string): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);
    await updateDoc(pairRef, { fridgeName });
};

/**
 * Update the fridge start date
 */
export const updateCreatedAt = async (code: string, createdAt: Date): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);
    await updateDoc(pairRef, { 
        createdAt: Timestamp.fromDate(createdAt) 
    });
};

/**
 * Get the stored pair ID from local storage
 */
export const getStoredPairId = async (): Promise<string | null> => {
    return await AsyncStorage.getItem(PAIR_ID_KEY);
};

/**
 * Get the stored user name from local storage
 */
export const getStoredUserName = async (): Promise<string | null> => {
    return await AsyncStorage.getItem(USER_NAME_KEY);
};

/**
 * Clear pairing data from local storage
 */
export const clearPairing = async (): Promise<void> => {
    await AsyncStorage.removeItem(PAIR_ID_KEY);
    await AsyncStorage.removeItem(USER_NAME_KEY);
};
