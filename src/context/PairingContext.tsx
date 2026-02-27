import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { doc, onSnapshot, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { db, auth } from '../services/firebase';
import { Pair } from '../types/Pair';
import { User } from '../types/User';
import {
    generatePairingCode,
    createPair as createPairService,
    joinPair as joinPairService,
    getStoredPairId,
    getStoredUserName,
    leaveFridge as leaveFridgeService,
    updateFridgeName as updateFridgeNameService,
    updateUserPhoto as updateUserPhotoService,
    updateCreatedAt as updateCreatedAtService,
    getUser,
    createUser,
    updateUser,
    signUpWithEmail as signUpService,
    signInWithEmail as signInService,
    sendResetEmail as sendResetEmailService,
    signInWithAppleCredential as signInWithAppleService,
    clearPairing,
    getHasCompletedOnboarding,
    getStoredFridgeName,
    setStoredFridgeName,
    setHasCompletedOnboarding
} from '../services/pairing';
import { initializeBilling } from '../services/billing';
import { registerForPushNotificationsAsync, updateUserMetadata } from '../services/notifications';
import { registerGeofences } from '../services/locationService';
import { PairUser } from '../types/PairUser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface PairingContextType {
    pairId: string | null;
    pendingPairId: string | null;
    pair: Pair | null;
    user: User | null;
    userName: string | null;
    loading: boolean;
    userLoading: boolean;
    error: string | null;
    isAuthTransitioning: boolean;
    setIsAuthTransitioning: (value: boolean) => void;
    hasCompletedOnboarding: boolean;
    isHydrated: boolean;
    completeOnboarding: () => void;
    createNewPair: (name: string, fridgeName?: string) => Promise<string>;
    joinExistingPair: (code: string, name: string) => Promise<void>;
    unpair: () => Promise<void>;
    updateFridgeName: (newName: string) => Promise<void>;
    updateUserName: (newName: string) => Promise<void>;
    setUserName: (newName: string) => void;
    updateUserPhoto: (photoURL: string) => Promise<void>;
    updateCreatedAt: (newDate: Date) => Promise<void>;
    cachedFridgeName: string | null;
    signUp: (email: string, password: string, name: string) => Promise<User>;
    signIn: (email: string, password: string) => Promise<User>;
    sendPasswordReset: (email: string) => Promise<void>;
    signInWithApple: () => Promise<User | void>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    reauthenticate: (credential: firebase.auth.AuthCredential) => Promise<void>;
    isDeletingAccount: boolean;
    isPremium: boolean;
    refreshPremiumStatus: () => Promise<void>;
}

const PairingContext = createContext<PairingContextType | undefined>(undefined);

export const PairingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pairId, setPairId] = useState<string | null>(null);
    const [pendingPairId, setPendingPairId] = useState<string | null>(null);
    const [pair, setPair] = useState<Pair | null>(null);
    const [cachedFridgeName, setCachedFridgeName] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [userLoading, setUserLoading] = useState(true);
    const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isPremiumSDK, setIsPremiumSDK] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Refs for Firestore listeners to allow atomic cleanup
    const pairUnsubRef = useRef<(() => void) | null>(null);

    const refreshPremiumStatus = async () => {
        const { checkPremiumStatus, syncPremiumStatusToFirebase } = require('../services/billing');
        try {
            const status = await checkPremiumStatus();
            setIsPremiumSDK(status);
            
            // If SDK says premium, but Firestore doesn't know yet, sync it
            if (status && user && (!user.isPremium || (pair && !pair.isPremiumEnabled))) {
                await syncPremiumStatusToFirebase(user.uid, true);
            }
        } catch (err) {
            console.error('Error refreshing premium status:', err);
        }
    };

    // Initial load from local storage
    useEffect(() => {
        const checkPremium = async () => {
            await refreshPremiumStatus();
        };

        const loadStoredData = async () => {
            try {
                const storedPairId = await getStoredPairId();
                const storedUserName = await getStoredUserName();
                const storedHasCompletedOnboarding = await getHasCompletedOnboarding();
                const storedFridgeName = await getStoredFridgeName();
                
                if (storedHasCompletedOnboarding) setHasCompletedOnboardingState(true);
                if (storedPairId) setPairId(storedPairId);
                if (storedFridgeName) setCachedFridgeName(storedFridgeName);
                if (storedUserName) {
                    setUserName(storedUserName);
                }
            } catch (err) {
                console.error('Error loading stored pairing data:', err);
            } finally {
                setIsHydrated(true);
            }
        };

        checkPremium();
        loadStoredData();
    }, []);

    // Handle Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUserLoading(true);
                try {
                    let userData = await getUser(firebaseUser.uid);
                    if (!userData) {
                        userData = await createUser(firebaseUser.uid, firebaseUser.email || null);
                    }
                    setUser(userData);
                    
                    // Sync fridge state (also persist to AsyncStorage for background tasks like geofencing)
                    if (userData.fridgeId) {
                        setPairId(userData.fridgeId);
                        AsyncStorage.setItem('@OurFridge:pairId', userData.fridgeId);
                    } else {
                        setPairId(null);
                        AsyncStorage.removeItem('@OurFridge:pairId');
                    }
                    
                    // Sync user name state
                    if (userData.name) {
                        setUserName(userData.name);
                    } else {
                        setUserName(null);
                    }
                    
                    // Initialize billing
                    initializeBilling(firebaseUser.uid).then(async () => {
                        await refreshPremiumStatus();
                    }).catch(err => 
                        console.error('Error initializing billing:', err)
                    );
                } catch (err) {
                    console.error('Error fetching user data:', err);
                } finally {
                    setUserLoading(false);
                }
            } else {
                // User is signed out
                setUser(null);
                setPairId(null);
            setUserName(null);
            setUserLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen to notification registration and sync metadata
    useEffect(() => {
        if (!pairId || !user) return;

        const syncNotifications = async () => {
            try {
                // 1. Try to get current token (fast if already granted)
                // Passing false to avoid triggering system prompt automatically
                let token = await registerForPushNotificationsAsync(false);

                // If we still don't have a token, but Firestore also has no token stored,
                // then we *must* prompt the user (otherwise this device will never receive widget updates).
                try {
                    const userRef = doc(db, 'pairs', pairId, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    const existingPushToken = userSnap.exists() ? (userSnap.data() as any)?.pushToken : null;

                    if (!token && !existingPushToken) {
                        token = await registerForPushNotificationsAsync(true);
                    }
                } catch (e) {
                }
                
                // 2. Sync to Firestore (updates lastSeenAt + token)
                // This informs the "Calm Logic" that the user is currently active
                await updateUserMetadata(pairId, user.uid, token);
            } catch (err) {
                console.error('Error syncing notifications:', err);
            }
        };

        syncNotifications();

        // Also sync when app comes back to foreground
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                syncNotifications();
            }
        });

        return () => subscription.remove();
    }, [pairId, user?.uid]);

    // Re-register geofences on app start so location reminders survive app kill / reboot
    useEffect(() => {
        if (!pairId || !user?.uid) return;

        const bootstrapGeofences = async () => {
            try {
                console.log('[Geofence Bootstrap] Starting for pairId:', pairId, 'userId:', user.uid);
                const userRef = doc(db, 'pairs', pairId, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                    console.log('[Geofence Bootstrap] User doc not found, skipping');
                    return;
                }

                const data = userSnap.data() as PairUser;
                const dep = data.reminders?.departureLocation;
                const store = data.reminders?.storeLocation;
                console.log('[Geofence Bootstrap] Reminders from Firestore:', {
                    departure: dep ? `${dep.latitude.toFixed(4)},${dep.longitude.toFixed(4)} enabled=${dep.isEnabled}` : 'none',
                    store: store ? `${store.latitude.toFixed(4)},${store.longitude.toFixed(4)} enabled=${store.isEnabled}` : 'none',
                });

                const hasEnabledDep = dep && dep.isEnabled !== false;
                const hasEnabledStore = store && store.isEnabled !== false;

                if (hasEnabledDep || hasEnabledStore) {
                    await registerGeofences(
                        hasEnabledDep ? dep : undefined,
                        hasEnabledStore ? store : undefined,
                    );
                    console.log('[Geofence Bootstrap] Registration complete');
                } else {
                    console.log('[Geofence Bootstrap] No enabled locations, skipping registration');
                }
            } catch (err) {
                console.error('[Geofence Bootstrap] Error:', err);
            }
        };

        bootstrapGeofences();
    }, [pairId, user?.uid]);

    // Listen to pair updates when pairId is set
    useEffect(() => {
        if (isAuthTransitioning) return; // 🔒 Guard: Don't auto-complete during transitions

        if (user?.fridgeId && !hasCompletedOnboarding) {
            completeOnboarding();
        }
    }, [user?.fridgeId, hasCompletedOnboarding, isAuthTransitioning]);

    // Listen to pair updates when pairId is set
    useEffect(() => {
        if (!pairId) {
            if (pairUnsubRef.current) {
                pairUnsubRef.current();
                pairUnsubRef.current = null;
            }
            setPair(null);
            setLoading(false);
            return;
        }

        // Clean up old listener first
        if (pairUnsubRef.current) {
            pairUnsubRef.current();
            pairUnsubRef.current = null;
        }

        setLoading(true);
        const pairRef = doc(db, 'pairs', pairId);
        const unsubscribe = onSnapshot(pairRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const fridgeName = data.fridgeName || '';
                setPair({
                    id: snapshot.id,
                    memberUids: data.memberUids || [],
                    memberNames: data.memberNames || {},
                    memberPhotos: data.memberPhotos || {},
                    fridgeName: fridgeName,
                    isPremiumEnabled: data.isPremiumEnabled || false,
                    createdAt: data.createdAt?.toDate() || new Date(),
                });
                // Update cache
                if (fridgeName) {
                    setCachedFridgeName(fridgeName);
                    setStoredFridgeName(fridgeName).catch(err => 
                        console.error("Error caching fridge name:", err)
                    );
                }
            } else if (pairId) {
                console.log("Pair document does not exist for ID:", pairId);
                setPair(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to pair updates:", error);
            setLoading(false);
        });

        pairUnsubRef.current = unsubscribe;

        return () => {
            if (pairUnsubRef.current) {
                pairUnsubRef.current();
                pairUnsubRef.current = null;
            }
        };
    }, [pairId]);

    const signUp = async (email: string, password: string, name: string) => {
        setError(null);
        setUserLoading(true);
        try {
            return await signUpService(email, password, name);
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
            throw err;
        } finally {
            setUserLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        setError(null);
        setUserLoading(true);
        try {
            return await signInService(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
            throw err;
        } finally {
            setUserLoading(false);
        }
    };

    const sendPasswordReset = async (email: string) => {
        setError(null);
        try {
            await sendResetEmailService(email);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
            throw err;
        }
    };

    const signInWithApple = async () => {
        setError(null);
        setUserLoading(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (credential.identityToken) {
                const fullName = credential.fullName 
                    ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
                    : undefined;
                
                // Note: nonce is optional for Firebase Apple Auth modular SDK if not specifically required by your project settings, 
                // but let's provide a placeholder or handle it if needed. 
                // For simplicity with Firebase v9+, usually identityToken is enough if nonce isn't enforced.
                return await signInWithAppleService(credential.identityToken, '', fullName || undefined, credential.email || undefined);
            }
        } catch (err: any) {
            if (err.code !== 'ERR_REQUEST_CANCELED') {
                setError(err.message || 'Failed to sign in with Apple');
                throw err;
            }
        } finally {
            setUserLoading(false);
        }
    };

    const logout = async () => {
        try {
            // 1. Kill listeners FIRST to stop the flow of old data
            if (pairUnsubRef.current) {
                pairUnsubRef.current();
                pairUnsubRef.current = null;
            }

            // 2. Clear all in-memory state synchronously
            setPairId(null);
            setPair(null);
            setUser(null);
            setUserName(null);
            setCachedFridgeName(null);
            setPendingPairId(null);
            setError(null);

            // 3. Clear disk cache
            await clearPairing();

            // 4. Sign out from Firebase last
            await signOut(auth);
        } catch (err) {
            console.error('Error logging out:', err);
        }
    };

    const reauthenticate = async (credential: firebase.auth.AuthCredential) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('No authenticated user');
        
        const { reauthenticateWithCredential } = await import('firebase/auth');
        await reauthenticateWithCredential(currentUser, credential);
    };

    const deleteAccount = async () => {
        if (!user) return;
        setIsDeletingAccount(true);
        try {
            // 1. Leave or delete the fridge first (handles data cleanup)
            // This must happen while the user is still authenticated
            if (pairId) {
                await leaveFridgeService(pairId, user.uid);
            }

            // 2. Delete the user document from Firestore
            const userRef = doc(db, 'users', user.uid);
            await deleteDoc(userRef);

            // 3. Delete the Firebase Auth user
            const currentUser = auth.currentUser;
            if (currentUser) {
                await currentUser.delete();
            }

            // 4. Cleanup local state
            await clearPairing();
            setPairId(null);
            setPair(null);
            setUser(null);
            setUserName(null);
        } catch (err: any) {
            console.error('Error deleting account:', err);
            throw err; // Re-throw to handle in UI (e.g., re-auth error)
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const createNewPair = async (name: string, fridgeName?: string) => {
        setError(null);
        try {
            if (!auth.currentUser) throw new Error('You must be signed in to create a fridge.');
            
            const code = generatePairingCode();
            const finalFridgeName = fridgeName || `${name}'s Fridge`;
            await createPairService(code, auth.currentUser.uid, name, finalFridgeName);
            setPendingPairId(code);
            setUserName(name);
            setCachedFridgeName(finalFridgeName); // Update cache immediately
            await setStoredFridgeName(finalFridgeName); // Persist to storage

            // Fetch updated user data immediately so AppNavigator sees the fridgeId
            const updatedUser = await getUser(auth.currentUser.uid);
            if (updatedUser) setUser(updatedUser);

            return code;
        } catch (err: any) {
            setError(err.message || 'Failed to create pair');
            throw err;
        }
    };

    const joinExistingPair = async (code: string, name: string) => {
        setError(null);
        try {
            if (!auth.currentUser) throw new Error('You must be signed in to join a fridge.');
            
            await joinPairService(code, auth.currentUser.uid, name);
            setPairId(code);
            setUserName(name);

            // Fetch updated user data immediately so AppNavigator sees the fridgeId
            const updatedUser = await getUser(auth.currentUser.uid);
            if (updatedUser) {
                setUser(updatedUser);
                // If we joined, we don't have the fridge name yet, 
                // but clearing the old one ensures we don't show the ghost name
                setCachedFridgeName(null); 
            }
        } catch (err: any) {
            setError(err.message || 'Failed to join pair');
            throw err;
        }
    };

    const unpair = async () => {
        if (!user || !pairId) return;
        setLoading(true);
        try {
            await leaveFridgeService(pairId, user.uid);
            setPairId(null);
            setPair(null);
            // Refresh user data
            const updatedUser = await getUser(user.uid);
            setUser(updatedUser);
        } catch (err) {
            console.error('Error unpairing:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateFridgeName = async (newName: string) => {
        if (!pairId) return;
        await updateFridgeNameService(pairId, newName);
    };

    const updateUserName = async (newName: string) => {
        if (!user || !pairId) return;
        // This needs to be updated in pairing.ts to handle the new structure
        // But for now we can just call updateUser and maybe update memberNames in pairs
        await updateUser(user.uid, { name: newName });
        const pairRef = doc(db, 'pairs', pairId);
        await updateDoc(pairRef, {
            [`memberNames.${user.uid}`]: newName
        });
        setUserName(newName);
        setUser(prev => prev ? { ...prev, name: newName } : null);
    };

    const updateUserPhoto = async (photoURL: string) => {
        if (!user) return;
        await updateUserPhotoService(user.uid, pairId, photoURL);
        setUser(prev => prev ? { ...prev, photoURL } : null);
    };

    const updateCreatedAt = async (newDate: Date) => {
        if (!pairId) return;
        await updateCreatedAtService(pairId, newDate);
    };

    const completeOnboarding = () => {
        if (pendingPairId) {
            setPairId(pendingPairId);
            setPendingPairId(null);
        }
        setHasCompletedOnboarding(true);
        setHasCompletedOnboardingState(true);
    };

    const combinedIsPremium = isPremiumSDK || user?.isPremium || pair?.isPremiumEnabled || false;

    return (
        <PairingContext.Provider value={{
            pairId,
            pendingPairId,
            pair,
            user,
            userName,
            loading,
            userLoading,
            isAuthTransitioning,
            setIsAuthTransitioning,
            error,
            hasCompletedOnboarding,
            isHydrated,
            isPremium: combinedIsPremium,
            refreshPremiumStatus,
            completeOnboarding,
            createNewPair,
            joinExistingPair,
            unpair,
            updateFridgeName,
            updateUserName,
            setUserName,
            updateUserPhoto,
            updateCreatedAt,
            cachedFridgeName,
            signUp,
            signIn,
            sendPasswordReset,
            signInWithApple,
            logout,
            deleteAccount,
            reauthenticate,
            isDeletingAccount,
        }}>
            {children}
        </PairingContext.Provider>
    );
};

export const usePairingContext = () => {
    const context = useContext(PairingContext);
    if (context === undefined) {
        throw new Error('usePairingContext must be used within a PairingProvider');
    }
    return context;
};
