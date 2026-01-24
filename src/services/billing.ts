import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';

// TODO: Replace with your actual API keys from RevenueCat dashboards
const REVENUECAT_API_KEY = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
}) || '';

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
        return typeof customerInfo.entitlements.active['Our Fridge - Pro'] !== "undefined";
    } catch (e) {
        return false;
    }
};

/**
 * Handle a purchase through RevenueCat
 */
export const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
    return await Purchases.purchasePackage(pkg);
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
export const presentPaywall = async (): Promise<boolean> => {
    try {
        // Present paywall for current offering:
        const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

        switch (paywallResult) {
            case PAYWALL_RESULT.NOT_PRESENTED:
            case PAYWALL_RESULT.ERROR:
            case PAYWALL_RESULT.CANCELLED:
                return false;
            case PAYWALL_RESULT.PURCHASED:
            case PAYWALL_RESULT.RESTORED:
                return true;
            default:
                return false;
        }
    } catch (e) {
        console.error("Error presenting paywall:", e);
        return false;
    }
};
