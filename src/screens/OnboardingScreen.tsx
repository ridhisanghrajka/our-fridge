import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Share,
    Alert,
    ScrollView,
    Image,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
// import * as Clipboard from 'expo-clipboard';
import { usePairing } from '../hooks/usePairing';
import Svg, { Path, Circle } from 'react-native-svg';

const FridgeHiImage = require('../assets/fridge_hi.png');

const { width: screenWidth } = Dimensions.get('window');

const EyeIcon = ({ size = 20, color = "#A89B8F", open = true }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {open ? (
            <>
                <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <Circle cx="12" cy="12" r="3" />
            </>
        ) : (
            <>
                <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <Path d="M1 1l22 22" />
            </>
        )}
    </Svg>
);

const OnboardingIcon = ({ type }: { type: 'welcome' | 'notifications' | 'premium' | 'success' }) => {
    switch (type) {
        case 'welcome':
            return (
                <View style={styles.iconContainer}>
                    <Image 
                        source={FridgeHiImage} 
                        style={styles.welcomeImage}
                        resizeMode="contain"
                    />
                </View>
            );
        case 'notifications':
            return (
                <View style={styles.iconCircle}>
                    <Svg width={60} height={60} viewBox="0 0 24 24" fill="#E79B74">
                        <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </Svg>
                </View>
            );
        case 'success':
            return (
                <View style={styles.iconCircle}>
                    <Svg width={60} height={60} viewBox="0 0 24 24" fill="#6B4B3E">
                        <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </Svg>
                </View>
            );
        default:
            return null;
    }
};

export const OnboardingScreen: React.FC = () => {
    const { 
        createNewPair, 
        joinExistingPair, 
        pairId, 
        userName, 
        user, 
        unpair, 
        completeOnboarding,
        signUp,
        signIn,
        signInWithApple,
        loading,
        userLoading,
        error: authError
    } = usePairing();

    const [step, setStep] = useState(() => {
        if (pairId) return 8; // Success/Share
        if (user) return 5;   // Setup Choice
        return 1;             // Welcome
    });
    const [name, setName] = useState(userName || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fridgeName, setFridgeName] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const nextStep = (targetStep?: number) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setStep(prev => (typeof targetStep === 'number') ? targetStep : prev + 1);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleSignUp = async () => {
        if (!email.trim() || !password.trim() || !name.trim()) {
            Alert.alert('Missing Details', 'Please enter your email, password, and name');
            return;
        }
        setIsProcessing(true);
        try {
            await signUp(email.trim(), password.trim(), name.trim());
            nextStep(5); // Move to setup choice
        } catch (err: any) {
            Alert.alert('Sign Up Error', err.message || 'Failed to create account');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing Details', 'Please enter your email and password');
            return;
        }
        setIsProcessing(true);
        try {
            await signIn(email.trim(), password.trim());
            // Auth listener in context will handle navigation if they already have a fridge
        } catch (err: any) {
            Alert.alert('Sign In Error', err.message || 'Failed to sign in');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAppleSignIn = async () => {
        try {
            await signInWithApple();
            // Auth listener will handle redirection
        } catch (err: any) {
            if (err.code !== 'ERR_REQUEST_CANCELED') {
                Alert.alert('Apple Sign In Error', err.message || 'Failed to sign in with Apple');
            }
        }
    };

    const handleCreate = async () => {
        setIsProcessing(true);
        try {
            const code = await createNewPair(userName || name.trim(), fridgeName.trim() || undefined);
            setGeneratedCode(code);
            nextStep(8); // Move to Success/Share
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to create fridge');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleJoin = async () => {
        if (!pairingCode.trim() || pairingCode.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code');
            return;
        }
        setIsProcessing(true);
        try {
            await joinExistingPair(pairingCode.trim(), userName || name.trim());
            completeOnboarding(); 
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to join fridge');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleShare = async () => {
        const codeToShare = generatedCode || pairId;
        if (codeToShare) {
            try {
                await Share.share({
                    message: `Join my fridge on Our Fridge! Use code: ${codeToShare}`,
                });
            } catch (error) {
                console.error('Error sharing code:', error);
            }
        }
    };

    const handleCopyCode = async () => {
        const codeToCopy = generatedCode || pairId;
        if (codeToCopy) {
            try {
                // await Clipboard.setStringAsync(codeToCopy);
                // Alert.alert('Copied!', 'Fridge code copied to clipboard.');
                
                // Fallback to share for now since expo-clipboard install failed in sandbox
                await Share.share({
                    message: codeToCopy,
                });
            } catch (error) {
                console.error('Error copying code:', error);
            }
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1: // Welcome
                return (
                    <View style={styles.stepContainer}>
                        <OnboardingIcon type="welcome" />
                        <Text style={styles.title}>Welcome to Our Fridge</Text>
                        <Text style={styles.subtitle}>
                            A shared space for your home, your groceries, and your love.
                        </Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={() => nextStep(2)}>
                            <Text style={styles.buttonText}>Get Started</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 2: // Gate Page
                return (
                    <View style={styles.stepContainer}>
                        <OnboardingIcon type="welcome" />
                        <Text style={styles.title}>Our Fridge</Text>
                        <Text style={styles.subtitle}>Share your home, together</Text>
                        
                        <View style={styles.socialProofBadge}>
                            <Text style={styles.socialProofText}>❤️ Join couples staying synced</Text>
                        </View>

                        <TouchableOpacity style={styles.primaryButton} onPress={() => nextStep(3)}>
                            <Text style={styles.buttonText}>Get Started</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.textLinkButton} onPress={() => nextStep(4)}>
                            <Text style={styles.textLink}>I already have an account</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 3: // Sign Up Page
                return (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                            <View style={styles.stepContainer}>
                                <Image source={FridgeHiImage} style={styles.smallHeroImage} resizeMode="contain" />
                                <Text style={styles.title}>Join Our Fridge</Text>
                                
                                <View style={styles.card}>
                                    <Text style={styles.label}>Your Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Ridhi"
                                        value={name}
                                        onChangeText={setName}
                                        textContentType="name"
                                    />
                                    <Text style={styles.label}>Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="email@example.com"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                        autoCorrect={false}
                                    />
                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.passwordInputContainer}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                            placeholder="••••••••"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            textContentType="newPassword"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <TouchableOpacity 
                                            style={styles.eyeIcon} 
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <EyeIcon open={showPassword} />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity 
                                        style={[styles.primaryButton, isProcessing && styles.disabledButton]} 
                                        onPress={handleSignUp}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Create Account</Text>}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.separatorContainer}>
                                    <View style={styles.separatorLine} />
                                    <Text style={styles.separatorText}>or</Text>
                                    <View style={styles.separatorLine} />
                                </View>

                                <AppleAuthentication.AppleAuthenticationButton
                                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                    cornerRadius={16}
                                    style={styles.appleButton}
                                    onPress={handleAppleSignIn}
                                />

                                <View style={styles.footerLinkRow}>
                                    <Text style={styles.footerText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => nextStep(4)}>
                                        <Text style={styles.footerLink}>Sign In</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                );

            case 4: // Sign In Page
                return (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                            <View style={styles.stepContainer}>
                                <Image source={FridgeHiImage} style={styles.smallHeroImage} resizeMode="contain" />
                                <Text style={styles.title}>Welcome Back</Text>
                                
                                <View style={styles.card}>
                                    <Text style={styles.label}>Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="email@example.com"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        textContentType="username"
                                        autoCorrect={false}
                                    />
                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.passwordInputContainer}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                            placeholder="••••••••"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            textContentType="password"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <TouchableOpacity 
                                            style={styles.eyeIcon} 
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <EyeIcon open={showPassword} />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity 
                                        style={[styles.primaryButton, isProcessing && styles.disabledButton]} 
                                        onPress={handleSignIn}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Sign In</Text>}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.separatorContainer}>
                                    <View style={styles.separatorLine} />
                                    <Text style={styles.separatorText}>or</Text>
                                    <View style={styles.separatorLine} />
                                </View>

                                <AppleAuthentication.AppleAuthenticationButton
                                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                    cornerRadius={16}
                                    style={styles.appleButton}
                                    onPress={handleAppleSignIn}
                                />

                                <View style={styles.footerLinkRow}>
                                    <Text style={styles.footerText}>New to Our Fridge? </Text>
                                    <TouchableOpacity onPress={() => nextStep(3)}>
                                        <Text style={styles.footerLink}>Create Account</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                );

            case 5: // Setup Choice (Was Step 2)
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Setup Your Space</Text>
                        <Text style={styles.subtitle}>
                            Create a new fridge or join one that's already been started.
                        </Text>
                        <View style={styles.choiceContainer}>
                            <TouchableOpacity style={styles.choiceCard} onPress={() => nextStep(6)}>
                                <View style={[styles.choiceIcon, { backgroundColor: '#F3E3D7' }]}>
                                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="#6B4B3E">
                                        <Path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                    </Svg>
                                </View>
                                <Text style={styles.choiceTitle}>Create New</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.choiceCard} onPress={() => nextStep(7)}>
                                <View style={[styles.choiceIcon, { backgroundColor: '#DDF3FF' }]}>
                                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="#6B4B3E">
                                        <Path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                                    </Svg>
                                </View>
                                <Text style={styles.choiceTitle}>Join Fridge</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 6: // Create Form (Was Step 3)
                return (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <View style={styles.stepContainer}>
                            <Text style={styles.title}>Your Fridge</Text>
                            <View style={styles.card}>
                                <Text style={styles.label}>Fridge Name (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Our Cozy Fridge"
                                    value={fridgeName}
                                    onChangeText={setFridgeName}
                                    autoFocus
                                />
                                <TouchableOpacity 
                                    style={[styles.primaryButton, isProcessing && styles.disabledButton]} 
                                    onPress={handleCreate}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.buttonText}>{isProcessing ? 'Creating...' : 'Create Fridge'}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.backButton} onPress={() => nextStep(5)}>
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                );

            case 7: // Join Form (Was Step 4)
                return (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <View style={styles.stepContainer}>
                            <Text style={styles.title}>Join Partner</Text>
                            <View style={styles.card}>
                                <Text style={styles.label}>6-Digit Code</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="000000"
                                    value={pairingCode}
                                    onChangeText={setPairingCode}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    autoFocus
                                />
                                <TouchableOpacity 
                                    style={[styles.secondaryButton, isProcessing && styles.disabledButton]} 
                                    onPress={handleJoin}
                                    disabled={isProcessing}
                                >
                                    <Text style={styles.buttonText}>{isProcessing ? 'Joining...' : 'Join Fridge'}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.backButton} onPress={() => nextStep(5)}>
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                );

            case 8: // Success / Share (Was Step 5)
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.iconCircle}>
                            <Svg width={60} height={60} viewBox="0 0 24 24" fill="#6B4B3E">
                                <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </Svg>
                        </View>
                        <Text style={styles.title}>Fridge Created!</Text>
                        <Text style={styles.subtitle}>
                            Share this code with your partner to start stocking your fridge together.
                        </Text>

                        <View style={styles.codeBox}>
                            <Text style={styles.codeText}>{generatedCode || pairId}</Text>
                        </View>

                        <TouchableOpacity style={styles.primaryButton} onPress={handleCopyCode}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                                    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                    <Path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
                                </Svg>
                                <Text style={styles.buttonText}>Copy Code</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.textLinkButton} onPress={completeOnboarding}>
                            <Text style={styles.textLink}>Next</Text>
                        </TouchableOpacity>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {renderStep()}
            </Animated.View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    stepContainer: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: '100%',
        height: screenWidth * 0.8,
        marginBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeImage: {
        width: screenWidth * 0.8,
        height: screenWidth * 0.8,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF7EE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: '#6B4B3E',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    title: {
        fontSize: 34,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 14, // Reduced from 18 for clarity
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22, // Adjusted for smaller font
    },
    primaryButton: {
        backgroundColor: '#6B4B3E',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    secondaryButton: {
        backgroundColor: '#E79B74',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16, // Reduced from 18 for standardized UI
        fontFamily: 'Inter-SemiBold',
    },
    choiceContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 40,
        width: '100%',
    },
    choiceCard: {
        flex: 1,
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#6B4B3E',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 5,
    },
    choiceIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    choiceTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#6B4B3E',
    },
    card: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: '#6B4B3E',
        marginBottom: 20,
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
        color: '#6B4B3E',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        borderWidth: 1,
        borderColor: '#DCC8B9',
        marginBottom: 20,
    },
    backButton: {
        padding: 12,
    },
    backButtonText: {
        color: '#6B4B3E',
        opacity: 0.6,
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    disabledButton: {
        opacity: 0.6,
    },
    codeContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    codeLabel: {
        fontSize: 14,
        color: '#948B84',
        marginBottom: 12,
    },
    codeBox: {
        backgroundColor: '#FFF7EE',
        paddingHorizontal: 48,
        paddingVertical: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#6B4B3E',
        marginBottom: 32,
        // Add a subtle shadow
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 3,
    },
    codeText: {
        fontSize: 48,
        fontFamily: 'Inter-Black',
        color: '#6B4B3E',
        letterSpacing: 6,
        fontVariant: ['tabular-nums'],
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 40,
    },
    smallHeroImage: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        height: '100%',
        justifyContent: 'center',
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        width: '100%',
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#DCC8B9',
    },
    separatorText: {
        marginHorizontal: 16,
        color: '#6B4B3E',
        opacity: 0.6,
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
    },
    appleButton: {
        width: '100%',
        height: 56,
        marginBottom: 24,
    },
    footerLinkRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    footerText: {
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
    },
    footerLink: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
    },
    textLinkButton: {
        padding: 12,
        marginTop: 8,
    },
    textLink: {
        color: '#6B4B3E',
        opacity: 0.6,
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        textDecorationLine: 'underline',
    },
    socialProofBadge: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 40,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    socialProofText: {
        color: '#E79B74',
        fontSize: 14,
        fontFamily: 'Inter-Bold',
    },
});
