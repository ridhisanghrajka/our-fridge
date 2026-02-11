import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { usePairing } from '../hooks/usePairing';

interface ReauthModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    providerId: string;
    email?: string;
}

export const ReauthModal: React.FC<ReauthModalProps> = ({ 
    visible, 
    onClose, 
    onSuccess, 
    providerId,
    email 
}) => {
    const { reauthenticate, signInWithApple } = usePairing();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailReauth = async () => {
        if (!password.trim()) {
            Alert.alert("Error", "Please enter your password.");
            return;
        }

        setIsLoading(true);
        try {
            if (!email) throw new Error("Email not found");
            const credential = EmailAuthProvider.credential(email, password);
            await reauthenticate(credential);
            onSuccess();
        } catch (err: any) {
            console.error("Re-auth error:", err);
            Alert.alert("Error", err.message || "Failed to verify. Please check your password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppleReauth = async () => {
        setIsLoading(true);
        try {
            // Re-triggering Apple Sign In will provide a fresh credential
            const { AppleAuthenticationScope, signInAsync } = await import('expo-apple-authentication');
            const appleCredential = await signInAsync({
                requestedScopes: [
                    AppleAuthenticationScope.FULL_NAME,
                    AppleAuthenticationScope.EMAIL,
                ],
            });

            if (appleCredential.identityToken) {
                const provider = new OAuthProvider('apple.com');
                const credential = provider.credential({
                    idToken: appleCredential.identityToken,
                    rawNonce: '', // Handled by Firebase if not enforced
                });
                await reauthenticate(credential);
                onSuccess();
            }
        } catch (err: any) {
            if (err.code !== 'ERR_REQUEST_CANCELED') {
                console.error("Apple re-auth error:", err);
                Alert.alert("Error", "Failed to verify with Apple. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.centeredView}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.title}>Verification Required</Text>
                        <Text style={styles.subtitle}>
                            For your security, please verify your identity to continue with account deletion.
                        </Text>

                        {providerId === 'password' ? (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#A08C84"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                    autoFocus
                                />
                                <TouchableOpacity 
                                    style={styles.primaryButton}
                                    onPress={handleEmailReauth}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF7EE" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Verify & Delete</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={styles.primaryButton}
                                onPress={handleAppleReauth}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF7EE" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Verify with Apple</Text>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        width: '100%',
        alignItems: 'center',
    },
    modalView: {
        width: '85%',
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputContainer: {
        width: '100%',
        gap: 16,
    },
    input: {
        width: '100%',
        backgroundColor: '#F3E3D7',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        borderWidth: 1,
        borderColor: '#DCC8B9',
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#6B4B3E',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#FFF7EE',
    },
    cancelButton: {
        marginTop: 16,
        padding: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#6B4B3E',
        opacity: 0.6,
    }
});
