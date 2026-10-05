import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { usePairing } from '../hooks/usePairing';
import { useInviteStore } from '../services/invite';

/**
 * Handles an invite link opened by someone who is already in a fridge.
 * Solo users can switch to the partner's fridge: leaving drops them back into
 * onboarding, which picks up the pending code and opens Join with it filled in.
 */
export const PendingInviteHandler: React.FC = () => {
    const { pair, pairId, user, unpair } = usePairing();
    const pendingInviteCode = useInviteStore((state) => state.pendingInviteCode);
    const setPendingInviteCode = useInviteStore((state) => state.setPendingInviteCode);
    const isPrompting = useRef(false);

    useEffect(() => {
        if (!pendingInviteCode || !user || !pair || !pairId || isPrompting.current) return;

        if (pendingInviteCode === pairId) {
            setPendingInviteCode(null);
            return;
        }

        const dismiss = () => {
            setPendingInviteCode(null);
            isPrompting.current = false;
        };
        isPrompting.current = true;

        if (pair.memberUids.length > 1) {
            Alert.alert(
                'Already in a fridge',
                'You already share a fridge with others. To join a different one, leave your current fridge first.',
                [{ text: 'OK', onPress: dismiss }]
            );
            return;
        }

        Alert.alert(
            "Join your partner's fridge?",
            `You'll switch to fridge ${pendingInviteCode}. Your current fridge only has you in it, so it will be removed along with its list and note.`,
            [
                { text: 'Not Now', style: 'cancel', onPress: dismiss },
                {
                    text: 'Join',
                    onPress: async () => {
                        await unpair();
                        isPrompting.current = false;
                    },
                },
            ]
        );
    }, [pendingInviteCode, pairId, pair?.memberUids.length, user]);

    return null;
};
