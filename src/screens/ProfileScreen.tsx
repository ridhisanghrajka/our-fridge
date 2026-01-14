import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { usePairing } from '../hooks/usePairing';

export const ProfileScreen: React.FC = () => {
    const { pair, pairId, userName, unpair } = usePairing();

    const handleUnpair = () => {
        unpair();
    };

    const getFridgeName = () => {
        if (!pair) return 'Loading...';
        const names = [pair.userAName, pair.userBName].filter(n => n);
        return names.length === 2 ? `${names[0]} & ${names[1]}'s Fridge` : `${names[0]}'s Fridge`;
    };

    const getPartnerName = () => {
        if (!pair || !userName) return 'Waiting for partner...';
        return pair.userAName === userName ? pair.userBName || 'Waiting for partner...' : pair.userAName;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.card}>
                <Text style={styles.emoji}>🧊</Text>
                <Text style={styles.fridgeName}>{getFridgeName()}</Text>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Your Name</Text>
                        <Text style={styles.infoValue}>{userName || 'Unknown'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Partner</Text>
                        <Text style={styles.infoValue}>{getPartnerName()}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Pairing Code</Text>
                        <Text style={styles.codeValue}>{pairId || '------'}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.unpairButton} onPress={handleUnpair}>
                    <Text style={styles.unpairButtonText}>Unpair & Reset</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#DDF3FF',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    fridgeName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3D2E25',
        textAlign: 'center',
        marginBottom: 32,
    },
    infoSection: {
        width: '100%',
        marginBottom: 32,
    },
    infoRow: {
        marginBottom: 20,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6B4B3E',
        marginBottom: 4,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 18,
        color: '#3D2E25',
        fontWeight: '500',
    },
    codeValue: {
        fontSize: 28,
        color: '#3D2E25',
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    unpairButton: {
        backgroundColor: '#E79B74',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        alignItems: 'center',
    },
    unpairButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
