import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import firebase from 'firebase/compat/app';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { db, auth } from '../../firebase.config';
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
    updateUserName as updateUserNameService,
    updateUserPhoto as updateUserPhotoService,
    updateCreatedAt as updateCreatedAtService,
    getUser,
    createUser,
    updateUser,
    signUpWithEmail as signUpService,
    signInWithEmail as signInService,
    signInWithAppleCredential as signInWithAppleService,
    clearPairing
} from '../services/pairing';
import { initializeBilling } from '../services/billing';

interface PairingContextType {
    pairId: string | null;
    pair: Pair | null;
    user: User | null;
    userName: string | null;
    loading: boolean;
    userLoading: boolean;
    error: string | null;
    hasJustStartedTrial: boolean;
    isOnboarding: boolean;
    isPremium: boolean;
    completeOnboarding: () => void;
    createNewPair: (name: string, fridgeName?: string) => Promise<string>;
    joinExistingPair: (code: string, name: string) => Promise<void>;
    unpair: () => Promise<void>;
    updateFridgeName: (newName: string) => Promise<void>;
    updateUserName: (newName: string) => Promise<void>;
    updateUserPhoto: (photoURL: string) => Promise<void>;
    updateCreatedAt: (newDate: Date) => Promise<void>;
    startTrial: () => Promise<void>;
    resetTrialTrigger: () => void;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithApple: () => Promise<void>;
    logout: () => Promise<void>;
}

const PairingContext = createContext<PairingContextType | undefined>(undefined);

export const PairingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pairId, setPairId] = useState<string | null>(null);
    const [pair, setPair] = useState<Pair | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [userLoading, setUserLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasJustStartedTrial, setHasJustStartedTrial] = useState(false);
    const [isOnboarding, setIsOnboarding] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    // Initial load from local storage
    useEffect(() => {
        const checkPremium = async () => {
            const { checkPremiumStatus } = require('../services/billing');
            try {
                const status = await checkPremiumStatus();
                setIsPremium(status);
            } catch (err) {
                console.error('Error checking premium status:', err);
            }
        };

        const loadStoredData = async () => {
            try {
                const storedPairId = await getStoredPairId();
                const storedUserName = await getStoredUserName();
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
                        const { checkPremiumStatus } = require('../services/billing');
                        const status = await checkPremiumStatus();
                        setIsPremium(status);
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
            setPairId(code);
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

    const startTrial = async () => {
        if (!user || user.trialStartedAt) return;
        const now = new Date();
        await updateUser(user.uid, { trialStartedAt: now });
        setUser(prev => prev ? { ...prev, trialStartedAt: now } : null);
        setHasJustStartedTrial(true);
    };

    const resetTrialTrigger = () => {
        setHasJustStartedTrial(false);
    };

    const completeOnboarding = () => {
        setIsOnboarding(false);
    };

    return (
        <PairingContext.Provider value={{
            pairId,
            pair,
            user,
            userName,
            loading,
            userLoading,
            error,
            hasJustStartedTrial,
            isOnboarding,
            isPremium,
            completeOnboarding,
            createNewPair,
            joinExistingPair,
            unpair,
            updateFridgeName,
            updateUserName,
            updateUserPhoto,
            updateCreatedAt,
            startTrial,
            resetTrialTrigger,
            signUp,
            signIn,
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
