import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePairing } from '../hooks/usePairing';

export const PairingScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { createNewPair, joinExistingPair, error } = usePairing();

    const handleCreatePair = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter your name');
            return;
        }

        setIsCreating(true);
        try {
            console.log('Creating new pair for:', name.trim());
            // You can optionally allow user to name the fridge here, 
            // for now we'll use the default logic in pairing service
            await createNewPair(name.trim());
            console.log('Pair created successfully!');
        } catch (err: any) {
            console.error('Error creating pair:', err);
            const errorMessage = err.message || 'Failed to create fridge';
            Alert.alert('Error', errorMessage + '\n\nPlease check:\n1. Firestore database is created\n2. Security rules allow write access');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinPair = async () => {
        if (!name.trim()) {
            Alert.alert('Name Required', 'Please enter your name');
            return;
        }

        if (!pairingCode.trim() || pairingCode.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter a 6-digit pairing code');
            return;
        }

        setIsCreating(true);
        try {
            await joinExistingPair(pairingCode.trim(), name.trim());
        } catch (err) {
            Alert.alert('Error', error || 'Failed to join fridge');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.content}>
                        <Text style={styles.title}>🧊 Our Fridge</Text>
                        <Text style={styles.subtitle}>Share your grocery list together</Text>

                        <View style={styles.card}>
                            <Text style={styles.label}>Your Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your name"
                                placeholderTextColor="#A89B8F"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />

                            <View style={styles.divider} />

                            <TouchableOpacity
                                style={[styles.button, styles.primaryButton]}
                                onPress={handleCreatePair}
                                disabled={isCreating}
                            >
                                <Text style={styles.buttonText}>Create New Fridge</Text>
                            </TouchableOpacity>

                            <View style={styles.orContainer}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>or</Text>
                                <View style={styles.orLine} />
                            </View>

                            <Text style={styles.label}>Pairing Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-digit code"
                                placeholderTextColor="#A89B8F"
                                value={pairingCode}
                                onChangeText={setPairingCode}
                                keyboardType="number-pad"
                                maxLength={6}
                            />

                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={handleJoinPair}
                                disabled={isCreating}
                            >
                                <Text style={styles.buttonText}>Join Fridge</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
    },
    title: {
        fontSize: 34,
        fontFamily: 'Poppins-Bold',
        color: '#3D2E25',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
        marginBottom: 40,
    },
    card: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: '#3D2E25',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#3D2E25',
        borderWidth: 2,
        borderColor: '#E3D2C3',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E3D2C3',
        marginVertical: 20,
    },
    button: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    primaryButton: {
        backgroundColor: '#6B4B3E',
    },
    secondaryButton: {
        backgroundColor: '#E79B74',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E3D2C3',
    },
    orText: {
        marginHorizontal: 12,
        color: '#6B4B3E',
        opacity: 0.6,
        fontSize: 14,
        fontFamily: 'Inter-Medium',
    },
});
