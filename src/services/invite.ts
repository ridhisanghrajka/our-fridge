import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from './firebase';

const INVITE_BASE_URL = 'https://our-fridge-5b835.web.app/join';
const PENDING_INVITE_KEY = '@pending_invite_code';

export const buildInviteLink = (code: string) => `${INVITE_BASE_URL}/${code}`;

/**
 * Extracts a fridge code from an invite URL, e.g.
 * ourfridge://join/123456 or https://our-fridge-5b835.web.app/join/123456
 */
export const parseInviteCode = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const match = url.match(/join\/(\d{6})(?:\/|\?|$)/);
    return match ? match[1] : null;
};

/**
 * Opens the share sheet with an invite link. Returns true if the user shared it.
 * Successful shares are counted on the fridge so we can measure the invite funnel.
 */
export const shareInvite = async (code: string, inviterName?: string | null): Promise<boolean> => {
    const intro = inviterName
        ? `${inviterName} set up a shared fridge for you on Our Fridge 🧊`
        : 'I set up a shared fridge for us on Our Fridge 🧊';
    const message = `${intro}\n\nJoin so we can share our grocery list and notes in real time:\n${buildInviteLink(code)}\n\nOr enter code ${code} in the app.`;

    try {
        const result = await Share.share({ message });
        if (result.action !== Share.sharedAction) return false;
        updateDoc(doc(db, 'pairs', code), {
            inviteShareCount: increment(1),
            lastInviteSharedAt: serverTimestamp(),
        }).catch((err) => console.error('Error recording invite share:', err));
        return true;
    } catch (error) {
        console.error('Error sharing invite:', error);
        return false;
    }
};

interface InviteState {
    pendingInviteCode: string | null;
    setPendingInviteCode: (code: string | null) => void;
    hydrate: () => Promise<void>;
}

/**
 * Holds a fridge code from an invite link until the user is signed in and can join.
 * Persisted so it survives the sign-up flow and app restarts.
 */
export const useInviteStore = create<InviteState>((set, get) => ({
    pendingInviteCode: null,
    setPendingInviteCode: (code) => {
        set({ pendingInviteCode: code });
        (code ? AsyncStorage.setItem(PENDING_INVITE_KEY, code) : AsyncStorage.removeItem(PENDING_INVITE_KEY))
            .catch((err) => console.error('Error persisting invite code:', err));
    },
    hydrate: async () => {
        const stored = await AsyncStorage.getItem(PENDING_INVITE_KEY);
        // Don't clobber a code that arrived from a link while we were reading storage
        if (stored && !get().pendingInviteCode) set({ pendingInviteCode: stored });
    },
}));
