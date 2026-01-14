import { collection, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../firebase.config';
import { Pair } from '../types/Pair';

const PAIR_ID_KEY = '@OurFridge:pairId';
const USER_NAME_KEY = '@OurFridge:userName';

/**
 * Generate a random 6-digit pairing code
 */
export const generatePairingCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create a new pair with the given code and user name
 */
export const createPair = async (code: string, userName: string): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);

    // Check if pair already exists
    const pairSnap = await getDoc(pairRef);
    if (pairSnap.exists()) {
        throw new Error('This pairing code already exists. Please try another one.');
    }

    // Create new pair
    const newPair: Omit<Pair, 'id'> = {
        userAName: userName,
        userBName: '',
        createdAt: new Date(),
    };

    await setDoc(pairRef, {
        ...newPair,
        createdAt: Timestamp.fromDate(newPair.createdAt),
    });

    // Save to local storage
    await AsyncStorage.setItem(PAIR_ID_KEY, code);
    await AsyncStorage.setItem(USER_NAME_KEY, userName);
};

/**
 * Join an existing pair with the given code and user name
 */
export const joinPair = async (code: string, userName: string): Promise<void> => {
    const pairRef = doc(db, 'pairs', code);

    // Check if pair exists
    const pairSnap = await getDoc(pairRef);
    if (!pairSnap.exists()) {
        throw new Error('Pairing code not found. Please check and try again.');
    }

    const pairData = pairSnap.data();

    // Check if pair is already full
    if (pairData.userBName && pairData.userBName !== '') {
        throw new Error('This fridge already has two users. Please create a new one.');
    }

    // Update pair with second user
    await updateDoc(pairRef, {
        userBName: userName,
    });

    // Save to local storage
    await AsyncStorage.setItem(PAIR_ID_KEY, code);
    await AsyncStorage.setItem(USER_NAME_KEY, userName);
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
