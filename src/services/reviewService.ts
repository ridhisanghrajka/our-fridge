import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

const FIRST_OPEN_KEY = '@first_open_date';
const JOY_MOMENTS_COUNT = '@joy_moments_count';
const LAST_REVIEW_REQUEST = '@last_review_request';

export const APP_STORE_ID = '6758370961';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;

/**
 * Records a "Joy Moment" (e.g., finishing a list, importing a recipe).
 * If thresholds are met (e.g., 3 joy moments and 2 days since install),
 * it triggers the native review popup.
 */
export const recordJoyMoment = async () => {
    try {
        // 1. Track first open date if not set
        let firstOpen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
        if (!firstOpen) {
            firstOpen = Date.now().toString();
            await AsyncStorage.setItem(FIRST_OPEN_KEY, firstOpen);
        }

        // 2. Increment joy moments count
        const countStr = await AsyncStorage.getItem(JOY_MOMENTS_COUNT) || '0';
        const newCount = parseInt(countStr) + 1;
        await AsyncStorage.setItem(JOY_MOMENTS_COUNT, newCount.toString());

        // 3. Check if we should ask for a review
        const daysSinceInstall = (Date.now() - parseInt(firstOpen)) / (1000 * 60 * 60 * 24);
        const lastRequest = await AsyncStorage.getItem(LAST_REVIEW_REQUEST);
        
        // Thresholds: 
        // - At least 3 joy moments
        // - At least 2 days since install
        // - At least 4 months since last request (Apple allows 3 per year)
        const fourMonthsInMs = 120 * 24 * 60 * 60 * 1000;
        const isTimeForNewRequest = !lastRequest || (Date.now() - parseInt(lastRequest)) > fourMonthsInMs;

        if (newCount >= 3 && daysSinceInstall >= 2 && isTimeForNewRequest) {
            if (await StoreReview.isAvailableAsync() && await StoreReview.hasAction()) {
                await StoreReview.requestReview();
                await AsyncStorage.setItem(LAST_REVIEW_REQUEST, Date.now().toString());
            }
        }
    } catch (error) {
        console.error('[ReviewService] Error recording joy moment:', error);
    }
};

/**
 * Manually triggers the review process. 
 * Used for the "Rate our fridge" button in settings.
 * Tries the native popup first, falls back to the App Store link.
 */
export const requestManualReview = async () => {
    try {
        const isAvailable = await StoreReview.isAvailableAsync();
        const hasAction = await StoreReview.hasAction();

        if (isAvailable && hasAction) {
            await StoreReview.requestReview();
        } else {
            Linking.openURL(APP_STORE_URL).catch(err => 
                console.error("[ReviewService] Couldn't load App Store page", err)
            );
        }
    } catch (error) {
        console.error('[ReviewService] Error in manual review:', error);
        // Final fallback
        Linking.openURL(APP_STORE_URL);
    }
};
