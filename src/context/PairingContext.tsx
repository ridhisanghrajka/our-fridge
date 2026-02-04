import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import firebase from 'firebase/compat/app';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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
    setHasAccount,
    getHasAccount
} from '../services/pairing';
import { initializeBilling } from '../services/billing';
import { registerForPushNotificationsAsync, updateUserMetadata } from '../services/notifications';
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
    isOnboarding: boolean;
    hasAccount: boolean;
    isPremium: boolean;
    refreshPremiumStatus: () => Promise<void>;
    completeOnboarding: () => void;
    createNewPair: (name: string, fridgeName?: string) => Promise<string>;
    joinExistingPair: (code: string, name: string) => Promise<void>;
    unpair: () => Promise<void>;
    updateFridgeName: (newName: string) => Promise<void>;
    updateUserName: (newName: string) => Promise<void>;
    setUserName: (newName: string) => void;
    updateUserPhoto: (photoURL: string) => Promise<void>;
    updateCreatedAt: (newDate: Date) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    signInWithApple: () => Promise<void>;
    logout: () => Promise<void>;
}

const PairingContext = createContext<PairingContextType | undefined>(undefined);

export const PairingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pairId, setPairId] = useState<string | null>(null);
    const [pendingPairId, setPendingPairId] = useState<string | null>(null);
    const [pair, setPair] = useState<Pair | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [userLoading, setUserLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOnboarding, setIsOnboarding] = useState(true);
    const [hasAccount, setHasAccountState] = useState(false);
    const [isPremiumSDK, setIsPremiumSDK] = useState(false);

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
                const storedHasAccount = await getHasAccount();
                
                if (storedHasAccount) setHasAccountState(true);
                if (storedPairId) setPairId(storedPairId);
                if (storedUserName) {
                    setUserName(storedUserName);
                    setIsOnboarding(false);
                }
            } catch (err) {
                console.error('Error loading stored pairing data:', err);
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
                    
                    // Sync fridge state
                    if (userData.fridgeId) {
                        setPairId(userData.fridgeId);
                    } else {
                        setPairId(null);
                    }
                    
                    // Sync user name state
                    if (userData.name) {
                        setUserName(userData.name);
                        setIsOnboarding(false);
                    } else {
                        setUserName(null);
                        setIsOnboarding(true);
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
                setIsOnboarding(true);
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
                // 1. Get current token (fast if already granted)
                // Passing false to avoid triggering system prompt automatically
                const token = await registerForPushNotificationsAsync(false);
                
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

    // Listen to pair updates when pairId is set
    useEffect(() => {
        if (!pairId) {
            setPair(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const pairRef = doc(db, 'pairs', pairId);
        const unsubscribe = onSnapshot(pairRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                    setPair({
                        id: snapshot.id,
                        memberUids: data.memberUids || [],
                        memberNames: data.memberNames || {},
                        memberPhotos: data.memberPhotos || {},
                        fridgeName: data.fridgeName || '',
                        isPremiumEnabled: data.isPremiumEnabled || false,
                        createdAt: data.createdAt?.toDate() || new Date(),
                    });
            } else if (pairId) {
                console.log("Pair document does not exist for ID:", pairId);
                setPair(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to pair updates:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pairId]);

    const signUp = async (email: string, password: string, name: string) => {
        setError(null);
        setUserLoading(true);
        try {
            await signUpService(email, password, name);
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
            await signInService(email, password);
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
                await signInWithAppleService(credential.identityToken, '', fullName || undefined, credential.email || undefined);
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
            await signOut(auth);
            await clearPairing();
            setPairId(null);
            setPair(null);
            setUser(null);
            setUserName(null);
            setIsOnboarding(true);
        } catch (err) {
            console.error('Error logging out:', err);
        }
    };

    const createNewPair = async (name: string, fridgeName?: string) => {
        setError(null);
        try {
            if (!auth.currentUser) throw new Error('You must be signed in to create a fridge.');
            
            const code = generatePairingCode();
            await createPairService(code, auth.currentUser.uid, name, fridgeName || `${name}'s Fridge`);
            setPendingPairId(code);
            setUserName(name);
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
        setIsOnboarding(false);
        setHasAccount(true);
        setHasAccountState(true);
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
            error,
            isOnboarding,
            hasAccount,
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
            signUp,
            signIn,
            sendPasswordReset,
            signInWithApple,
            logout,
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
