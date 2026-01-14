import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { Pair } from '../types/Pair';
import {
    generatePairingCode,
    createPair as createPairService,
    joinPair as joinPairService,
    getStoredPairId,
    getStoredUserName,
    clearPairing as clearPairingService
} from '../services/pairing';

export const usePairing = () => {
    const [pairId, setPairId] = useState<string | null>(null);
    const [pair, setPair] = useState<Pair | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load stored pair ID and user name on mount
    useEffect(() => {
        const loadStoredData = async () => {
            try {
                const storedPairId = await getStoredPairId();
                const storedUserName = await getStoredUserName();
                setPairId(storedPairId);
                setUserName(storedUserName);
            } catch (err) {
                console.error('Error loading stored data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadStoredData();
    }, []);

    // Listen to pair updates when pairId is set
    useEffect(() => {
        if (!pairId) {
            setPair(null);
            return;
        }

        const pairRef = doc(db, 'pairs', pairId);
        const unsubscribe = onSnapshot(pairRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setPair({
                    id: snapshot.id,
                    userAName: data.userAName,
                    userBName: data.userBName,
                    createdAt: data.createdAt?.toDate() || new Date(),
                });
            } else {
                setPair(null);
            }
        });

        return () => unsubscribe();
    }, [pairId]);

    const createNewPair = async (name: string) => {
        setError(null);
        try {
            const code = generatePairingCode();
            await createPairService(code, name);
            setPairId(code);
            setUserName(name);
        } catch (err: any) {
            setError(err.message || 'Failed to create pair');
            throw err;
        }
    };

    const joinExistingPair = async (code: string, name: string) => {
        setError(null);
        try {
            await joinPairService(code, name);
            setPairId(code);
            setUserName(name);
        } catch (err: any) {
            setError(err.message || 'Failed to join pair');
            throw err;
        }
    };

    const unpair = async () => {
        await clearPairingService();
        setPairId(null);
        setPair(null);
        setUserName(null);
    };

    return {
        pairId,
        pair,
        userName,
        loading,
        error,
        createNewPair,
        joinExistingPair,
        unpair,
    };
};
