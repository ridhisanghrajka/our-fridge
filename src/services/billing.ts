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
    Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN);
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
        const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall({ displayCloseButton: true });

        let isPurchased = false;
        switch (paywallResult) {
            case PAYWALL_RESULT.NOT_PRESENTED:
            case PAYWALL_RESULT.ERROR:
            case PAYWALL_RESULT.CANCELLED:
                isPurchased = false;
                break;
            case PAYWALL_RESULT.PURCHASED:
                isPurchased = true;
                break;
            case PAYWALL_RESULT.RESTORED:
                // Check if they actually have the entitlement after restoration
                isPurchased = await checkPremiumStatus();
                break;
            default:
                isPurchased = false;
        }

        return isPurchased;
    } catch (e) {
        console.error("Error presenting paywall:", e);
        return false;
    }
};
