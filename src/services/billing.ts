import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

// TODO: Replace with your actual API keys from RevenueCat dashboards
const REVENUECAT_API_KEY = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}) || '';

/**
 * Sync premium status to Firestore for both user and their pair
 */
export const syncPremiumStatusToFirebase = async (userId: string, isPremium: boolean) => {
    try {
        // 1. Update user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { isPremium });

        // 2. Get user's fridgeId to update the pair document
        // We'll import getUser from pairing to avoid circular dependency if possible, 
        // but for simplicity and to avoid issues, we can just fetch it here or pass it.
        // Let's fetch the user doc to get the fridgeId.
        const { getUser } = require('./pairing');
        const userData = await getUser(userId);
        
        if (userData?.fridgeId) {
            const pairRef = doc(db, 'pairs', userData.fridgeId);
            await updateDoc(pairRef, { isPremiumEnabled: isPremium });
        }
    } catch (e) {
        console.error("Error syncing premium status to Firebase:", e);
    }
};

/**
 * Initialize billing services
 */
export const initializeBilling = async (userId: string) => {
    // 1. Initialize RevenueCat
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
};

/**
 * Check if the user has an active subscription
 */
export const checkPremiumStatus = async (): Promise<boolean> => {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        // This matches your RevenueCat Entitlement ID
        const isPremium = typeof customerInfo.entitlements.active['Our Fridge -  Pro'] !== "undefined";
        return isPremium;
    } catch (e) {
        return false;
    }
};

/**
 * Handle a purchase through RevenueCat
 */
export const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<CustomerInfo> => {
    return await Purchases.restorePurchases();
};

/**
 * Present the RevenueCat Paywall
 */
export const presentPaywall = async (userId?: string): Promise<boolean> => {
    try {
        // Present paywall for current offering:
        const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

        let isPurchased = false;
        switch (paywallResult) {
            case PAYWALL_RESULT.NOT_PRESENTED:
            case PAYWALL_RESULT.ERROR:
            case PAYWALL_RESULT.CANCELLED:
                isPurchased = false;
                break;
            case PAYWALL_RESULT.PURCHASED:
            case PAYWALL_RESULT.RESTORED:
                isPurchased = true;
                break;
            default:
                isPurchased = false;
        }

        // If purchased and we have a userId, sync to Firebase
        if (isPurchased && userId) {
            await syncPremiumStatusToFirebase(userId, true);
        }

        return isPurchased;
    } catch (e) {
        console.error("Error presenting paywall:", e);
        return false;
    }
};
