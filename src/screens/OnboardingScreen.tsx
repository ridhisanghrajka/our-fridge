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
    ActivityIndicator,
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import LottieView from 'lottie-react-native';
// import * as Clipboard from 'expo-clipboard';
import { usePairing } from '../hooks/usePairing';
import { registerForPushNotificationsAsync } from '../services/notifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Svg, { Path, Circle } from 'react-native-svg';

const FridgeHiImage = require('../assets/fridge_hi.png');
const Scene1Animation = require('../assets/animations/scene1.json');
const Scene2Animation = require('../assets/animations/scene2.json');
const NotificationAnimation = require('../assets/animations/Notification-remix.json');

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

const OnboardingIcon = ({ type, bounceAnim }: { type: 'welcome' | 'notifications' | 'premium' | 'success', bounceAnim?: Animated.Value }) => {
    switch (type) {
        case 'welcome':
            return (
                <Animated.View 
                    style={[
                        styles.iconContainer,
                        bounceAnim && {
                            transform: [
                                {
                                    scale: bounceAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.3, 1]
                                    })
                                },
                                {
                                    translateY: bounceAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [50, 0]
                                    })
                                },
                                {
                                    scaleX: bounceAnim.interpolate({
                                        inputRange: [0, 0.8, 0.9, 1],
                                        outputRange: [1, 1, 1.1, 1] // Slight stretch on landing
                                    })
                                },
                                {
                                    scaleY: bounceAnim.interpolate({
                                        inputRange: [0, 0.8, 0.9, 1],
                                        outputRange: [1, 1, 0.9, 1] // Slight squash on landing
                                    })
                                }
                            ]
                        }
                    ]}
                >
                    <Image 
                        source={FridgeHiImage} 
                        style={styles.welcomeImage}
                        resizeMode="contain"
                    />
                </Animated.View>
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
        sendPasswordReset,
        signInWithApple,
        setUserName,
        loading,
        userLoading,
        error: authError,
        hasAccount
    } = usePairing();

    const [step, setStep] = useState(() => {
        if (user && !pairId) return 5;   // Setup Choice if logged in but no fridge
        return 1;                       // Always start at Welcome carousel to prevent Step 8 flicker
    });

    // Handle returning users who logged out
    React.useEffect(() => {
        const checkStatusAndRedirect = async () => {
            if (!user && !pairId && hasAccount && step === 1) {
                if (Device.isDevice) {
                    const { status } = await Notifications.getPermissionsAsync();
                    if (status !== 'undetermined') {
                        setStep(4); // Skip to Sign In only if notifications already handled
                    }
                } else {
                    setStep(4); // On simulator, just skip
                }
            }
        };
        checkStatusAndRedirect();
    }, [hasAccount, user, pairId]);
    const [nameError, setNameError] = useState('');
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fridgeName, setFridgeName] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (step === 1) {
            // Reset animations
            bounceAnim.setValue(0);

            // Run image bounce only
            Animated.spring(bounceAnim, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [step]);

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
        setNameError('');
        setEmailError('');
        setPasswordError('');

        let hasError = false;
        if (!userName?.trim()) {
            setNameError('Please enter your name');
            hasError = true;
        }
        if (!email.trim()) {
            setEmailError('Please enter your email');
            hasError = true;
        } else if (!email.includes('@')) {
            setEmailError('Please enter a valid email');
            hasError = true;
        }
        if (!password.trim()) {
            setPasswordError('Please enter a password');
            hasError = true;
        } else if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            hasError = true;
        }

        if (hasError) {
            if (Platform.OS !== 'web') {
                const Haptics = require('expo-haptics');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            return;
        }

        setIsProcessing(true);
        try {
            await signUp(email.trim(), password.trim(), userName?.trim() || '');
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

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Email Required', 'Please enter your email address to reset your password.');
            return;
        }
        
        setIsProcessing(true);
        try {
            await sendPasswordReset(email.trim());
            Alert.alert(
                'Reset Email Sent', 
                'If an account exists for this email, you will receive a password reset link shortly.'
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to send reset email');
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
        let displayName = userName?.trim();
        
        // Fallback to user object name if local state is empty
        if (!displayName && user?.name) {
            displayName = user.name;
        }

        // Last resort: try to fetch fresh user data if we have a UID
        if (!displayName && user?.uid) {
            try {
                const { getUser } = require('../services/pairing');
                const freshUser = await getUser(user.uid);
                if (freshUser?.name) {
                    displayName = freshUser.name;
                    setUserName(freshUser.name); // Sync back to context
                }
            } catch (err) {
                console.error('Error fetching fresh user name:', err);
            }
        }

        // Final fallback to "User" if everything else fails
        const finalName = displayName || 'User';

        setIsProcessing(true);
        try {
            const code = await createNewPair(finalName, fridgeName.trim() || undefined);
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

        let displayName = userName?.trim();
        
        // Fallback to user object name if local state is empty
        if (!displayName && user?.name) {
            displayName = user.name;
        }

        // Final fallback to "User" if everything else fails
        const finalName = displayName || 'User';

        setIsProcessing(true);
        try {
            await joinExistingPair(pairingCode.trim(), finalName);
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

    const carouselData = [
        {
            id: '1',
            title: 'Welcome to\nOur Fridge',
            subtitle: 'A shared fridge that keeps everyone in sync.',
            type: 'image',
            source: FridgeHiImage,
        },
        {
            id: '2',
            title: 'Track Together',
            subtitle: 'Maintain a shared grocery list and notes.',
            type: 'lottie',
            source: Scene1Animation,
        },
        {
            id: '3',
            title: 'Update live with widgets',
            subtitle: 'Share notes and drawings with up to 4 users',
            type: 'lottie',
            source: Scene2Animation,
        }
    ];

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollOffset / screenWidth);
        setCurrentCarouselIndex(index);
    };

    const handleNext = async () => {
        if (currentCarouselIndex < carouselData.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentCarouselIndex + 1,
                animated: true,
            });
        } else {
            // Check if we should show the notification pre-prompt screen
            let shouldShowNotifications = false;
            
            if (Device.isDevice) {
                const { status } = await Notifications.getPermissionsAsync();
                // status will be 'undetermined' if the user hasn't responded to the system prompt yet
                shouldShowNotifications = status === 'undetermined';
            }

            if (shouldShowNotifications) {
                nextStep(9);
            } else {
                nextStep(hasAccount ? 4 : 2);
            }
        }
    };

    const renderCarouselItem = ({ item, index }: { item: any, index: number }) => {
        return (
            <View style={styles.carouselPage}>
                <View style={styles.welcomeContent}>
                    {item.type === 'lottie' ? (
                        <View style={styles.lottieContainer}>
                            <LottieView
                                source={item.source}
                                autoPlay
                                loop
                                style={styles.lottieAnimation}
                            />
                        </View>
                    ) : (
                        <OnboardingIcon type="welcome" bounceAnim={index === 0 ? bounceAnim : undefined} />
                    )}
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderStep = () => {
        switch (step) {
            case 1: // Carousel
                return (
                    <View style={styles.welcomeStepContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={carouselData}
                            renderItem={renderCarouselItem}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                            keyExtractor={(item) => item.id}
                            style={{ flex: 1 }}
                        />
                        
                        <View style={styles.footerContainer}>
                            <View style={styles.paginationContainer}>
                                {carouselData.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.paginationDot,
                                            currentCarouselIndex === index && styles.paginationDotActive
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity 
                                style={[styles.primaryButton, styles.buttonGlow]} 
                                onPress={handleNext}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.buttonText}>
                                    {currentCarouselIndex === carouselData.length - 1 ? 'Get Started' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 2: // Gate Page
                return (
                    <View style={styles.stepContainer}>
                        <OnboardingIcon type="welcome" />
                        <View style={{ alignItems: 'center', marginBottom: 32 }}>
                            <Text style={styles.title}>Our Fridge</Text>
                            <Text style={[styles.subtitle, { marginBottom: 0 }]}>
                                Keep your kitchen in sync, wherever you are.
                            </Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.primaryButton, styles.buttonGlow]} 
                            onPress={() => nextStep(3)}
                        >
                            <Text style={styles.buttonText}>Create My Account</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.outlineButton} onPress={() => nextStep(4)}>
                            <Text style={styles.outlineButtonText}>I already have an account</Text>
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
                                        style={[styles.input, nameError ? styles.inputError : null]}
                                        placeholder="e.g. Tom"
                                        value={userName || ''}
                                        onChangeText={(text) => {
                                            setUserName(text);
                                            if (nameError) setNameError('');
                                        }}
                                        textContentType="name"
                                    />
                                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

                                    <Text style={styles.label}>Email</Text>
                                    <TextInput
                                        style={[styles.input, emailError ? styles.inputError : null]}
                                        placeholder="email@example.com"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (emailError) setEmailError('');
                                        }}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                        autoCorrect={false}
                                    />
                                    {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.passwordInputContainer}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, marginBottom: 0 }, passwordError ? styles.inputError : null]}
                                            placeholder="••••••••"
                                            value={password}
                                            onChangeText={(text) => {
                                                setPassword(text);
                                                if (passwordError) setPasswordError('');
                                            }}
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
                                    {passwordError ? <Text style={[styles.errorText, { marginTop: 8 }]}>{passwordError}</Text> : null}

                                    <TouchableOpacity 
                                        style={[
                                            styles.primaryButton, 
                                            (isProcessing || !userName || !email || !password) && styles.disabledButton,
                                            { marginTop: 12 }
                                        ]} 
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

                                <TouchableOpacity style={[styles.backButton, { marginTop: 24 }]} onPress={() => nextStep(1)}>
                                    <Text style={styles.backButtonText}>Back to Welcome</Text>
                                </TouchableOpacity>
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
                                        style={styles.forgotPasswordButton} 
                                        onPress={handleForgotPassword}
                                        disabled={isProcessing}
                                    >
                                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                    </TouchableOpacity>

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

                                <TouchableOpacity style={[styles.backButton, { marginTop: 24 }]} onPress={() => nextStep(1)}>
                                    <Text style={styles.backButtonText}>Back to Welcome</Text>
                                </TouchableOpacity>
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
                                    textContentType="none"
                                    autoComplete="off"
                                    autoCorrect={false}
                                    spellCheck={false}
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
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                        style={{ flex: 1, width: '100%' }}
                    >
                        <ScrollView 
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                            keyboardShouldPersistTaps="handled"
                        >
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
                                        textContentType="oneTimeCode"
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
                        </ScrollView>
                    </KeyboardAvoidingView>
                );

            case 8: // Success / Share (Was Step 5)
                return (
                    <View style={{ flex: 1, width: '100%', paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
                        <View style={[styles.stepContainer, { flex: 1, justifyContent: 'center' }]}>
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

                            <TouchableOpacity style={styles.textLinkButton} onPress={handleShare}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6B4B3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, opacity: 0.6 }}>
                                        <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                        <Path d="M16 6l-4-4-4 4" />
                                        <Path d="M12 2v13" />
                                    </Svg>
                                    <Text style={styles.textLink}>Share Code</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={{ paddingHorizontal: 24 }}>
                            <TouchableOpacity style={[styles.primaryButton, styles.buttonGlow]} onPress={completeOnboarding}>
                                <Text style={styles.buttonText}>Next</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 9: // Notification Permission Step
                return (
                    <View style={[styles.stepContainer, { justifyContent: 'flex-start', paddingTop: 40 }]}>
                        <Text style={styles.notificationPageTitle}>Notifications</Text>
                        <View style={[styles.lottieContainer, { height: screenWidth * 0.8, marginBottom: -20 }]}>
                            <LottieView
                                source={NotificationAnimation}
                                autoPlay
                                loop={false}
                                style={styles.lottieAnimation}
                            />
                        </View>
                        
                        <View style={{ alignItems: 'center', width: '100%', marginBottom: 32 }}>
                            <Text style={styles.notificationTitle}>Right-time reminders, not noise</Text>
                            
                            <View style={styles.bulletPointsContainer}>
                                <View style={styles.bulletPoint}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.bulletText}>Get notified when items are added or updated</Text>
                                </View>
                                <View style={styles.bulletPoint}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.bulletText}>See notes and changes instantly from your partner</Text>
                                </View>
                                <View style={styles.bulletPoint}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.bulletText}>Get reminders when you’re leaving work or near a store</Text>
                                </View>
                                
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.primaryButton, styles.buttonGlow]} 
                            onPress={async () => {
                                await registerForPushNotificationsAsync(true);
                                nextStep(hasAccount ? 4 : 2);
                            }}
                        >
                            <Text style={styles.buttonText}>Enable Notifications</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.textLinkButton} 
                            onPress={() => nextStep(hasAccount ? 4 : 2)}
                        >
                            <Text style={[styles.textLink, styles.smallLink]}>Not Now</Text>
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
    },
    stepContainer: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 24, // Restore padding for non-carousel steps
    },
    iconContainer: {
        width: '100%',
        height: screenWidth * 1.2, // Increased from 1.0
        marginBottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeImage: {
        width: screenWidth * 1.2, // Increased from 1.0
        height: screenWidth * 1.2, // Increased from 1.0
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
        fontSize: 40,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 17, // Increased from 14
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 0.6,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 26, // Slightly increased for better readability
        paddingHorizontal: 30, // Added padding to match main text
    },
    welcomeStepContainer: {
        flex: 1,
        width: screenWidth,
    },
    welcomeContent: {
        flex: 1,
        width: screenWidth,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonGlow: {
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    primaryButton: {
        backgroundColor: '#6B4B3E',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(107, 75, 62, 0.2)',
        marginTop: 4,
    },
    outlineButtonText: {
        color: '#6B4B3E',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        opacity: 0.8,
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
    inputError: {
        borderColor: '#E79B74',
        borderWidth: 1.5,
    },
    errorText: {
        color: '#E79B74',
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        marginTop: -16,
        marginBottom: 16,
        marginLeft: 4,
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
        marginTop: 20,
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
    smallLink: {
        fontSize: 14,
        opacity: 0.4,
        textDecorationLine: 'none',
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: -12,
        marginBottom: 24,
        paddingVertical: 4,
    },
    forgotPasswordText: {
        color: '#6B4B3E',
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        opacity: 0.6,
        textDecorationLine: 'underline',
    },
    footerContainer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        width: '100%',
    },
    carouselPage: {
        width: screenWidth,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24, // Add padding to keep text from edges
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20, // Reduced from 32
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DCC8B9',
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#6B4B3E',
        width: 20,
    },
    lottieContainer: {
        width: screenWidth * 1.05, // Increased by 50% (from 0.7 to 1.05)
        height: screenWidth * 1.2, // Match iconContainer height to align text
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0, // Match iconContainer marginBottom to align text,
    },
    lottieAnimation: {
        width: '100%',
        height: '95%',
    },
    notificationPageTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        textAlign: 'center',
        marginBottom: 0,
    },
    notificationTitle: {
        fontSize: 28,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        textAlign: 'center',
        marginBottom: 16,
    },
    bulletPointsContainer: {
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 10,
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    bulletDot: {
        fontSize: 18,
        color: '#6B4B3E',
        marginRight: 10,
        lineHeight: 24,
    },
    bulletText: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#6B4B3E',
        opacity: 1,
        lineHeight: 24,
        flex: 1,
    },
});
