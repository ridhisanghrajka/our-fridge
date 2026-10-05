import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePairing } from '../hooks/usePairing';
import { shareInvite } from '../services/invite';

const DISMISSED_AT_KEY = '@invite_banner_dismissed_at';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Floating nudge on the fridge while the user is its only member.
 * Dismissing snoozes it for a few days.
 */
export const InviteBanner: React.FC = () => {
    const { pair, pairId, userName } = usePairing();
    const topInset = useContext(SafeAreaInsetsContext)?.top ?? 47;
    const [snoozed, setSnoozed] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(DISMISSED_AT_KEY).then((value) => {
            setSnoozed(!!value && Date.now() - parseInt(value, 10) < SNOOZE_MS);
        });
    }, []);

    if (!pair || !pairId || pair.memberUids.length > 1 || snoozed) return null;

    const dismiss = () => {
        setSnoozed(true);
        AsyncStorage.setItem(DISMISSED_AT_KEY, Date.now().toString());
    };

    return (
        <View style={[styles.container, { top: topInset + 8 }]} pointerEvents="box-none">
            <View style={styles.pill}>
                <TouchableOpacity style={styles.inviteButton} onPress={() => shareInvite(pairId, userName)} activeOpacity={0.8}>
                    <Text style={styles.text}>💌  Invite your partner to this fridge</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7EE',
        borderWidth: 1.5,
        borderColor: '#6B4B3E',
        borderRadius: 20,
        paddingLeft: 14,
        paddingRight: 12,
        paddingVertical: 8,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    inviteButton: {
        marginRight: 10,
    },
    text: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: '#6B4B3E',
    },
    close: {
        fontSize: 14,
        color: '#A89B8F',
    },
});
