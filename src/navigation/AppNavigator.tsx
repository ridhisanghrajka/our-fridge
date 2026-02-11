import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { FridgeScreen } from '../screens/FridgeScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PairingScreen } from '../screens/PairingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AddRecipeScreen } from '../screens/AddRecipeScreen';
import { ImportRecipeScreen } from '../screens/ImportRecipeScreen';
import { WidgetSynchronizer } from '../components/WidgetSynchronizer';
import { usePairing } from '../hooks/usePairing';
import { useShareStore } from '../services/shareStore';
import { View, ActivityIndicator, StyleSheet, Alert, Animated, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const FridgeHiImage = require('../assets/fridge_hi.png');

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const linking = {
    prefixes: [Linking.createURL('/'), 'ourfridge://'],
    config: {
        screens: {
            MainTabs: {
                screens: {
                    Fridge: 'fridge',
                    Profile: 'profile',
                    Activity: 'activity',
                    Meals: 'meals',
                }
            },
            ImportRecipe: 'import',
        },
    },
};

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 30,
                    backgroundColor: '#F5F5F5',
                    borderRadius: 30,
                    borderTopWidth: 0,
                    elevation: 8,
                    shadowColor: '#6B4B3E',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.1,
                    shadowRadius: 24,
                    height: 60,
                    marginHorizontal: 40,
                    paddingBottom: 0,
                    left: 0,
                    right: 0,
                },
                tabBarActiveTintColor: '#6B4B3E',
                tabBarInactiveTintColor: '#A89B8F',
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'Inter-Bold',
                    paddingBottom: 4,
                },
                tabBarItemStyle: {
                    height: 60,
                    borderRadius: 30,
                    paddingVertical: 4,
                },
                headerStyle: {
                    backgroundColor: '#DDF3FF',
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
                headerTitleStyle: {
                    fontSize: 20,
                    fontFamily: 'Poppins-Bold',
                    color: '#3D2E25',
                },
            }}
        >
            <Tab.Screen
                name="Fridge"
                component={FridgeScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path fill={color} d="M17 2H7c-1.1 0-2 .9-2 2v15a2 2 0 0 0 2 2v1h2v-1h6v1h2v-1c1.11 0 2-.89 2-2V4a2 2 0 0 0-2-2m-7 13H8v-5h2z" />
                        </Svg>
                    ),
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Meals"
                component={MealsScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path fill={color} d="M8.1 13.34l2.83-2.83L3.91 3.5a4.008 4.008 0 0 0 0 5.66zm6.78-1.81c1.53.71 3.68.21 5.27-1.38c1.91-1.91 2.28-4.65.81-6.12c-1.46-1.46-4.2-1.1-6.12.81c-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88l1.41-1.41L13.41 13.1z" />
                        </Svg>
                    ),
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Activity"
                component={ActivityScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path fill={color} d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                        </Svg>
                    ),
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path fill={color} d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.4 3.4 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.4 3.4 0 0 0 15 11a3.5 3.5 0 0 0 0-7" />
                        </Svg>
                    ),
                    headerShown: false,
                }}
            />
        </Tab.Navigator>
    );
};

export const AppNavigator: React.FC = () => {
    const { 
        pairId, 
        userName, 
        loading, 
        userLoading, 
        isAuthTransitioning,
        user, 
        unpair, 
        hasCompletedOnboarding, 
        isHydrated 
    } = usePairing();
    const navigationRef = useNavigationContainerRef();
    const pendingRecipeUrl = useShareStore((state) => state.pendingRecipeUrl);
    const bounceAnim = React.useRef(new Animated.Value(0)).current;

    // 1. The Latch (Session-based)
    const [onboardingFinished, setOnboardingFinished] = React.useState<boolean | null>(null);

    // 2. The Boot Sequence (Safe & Fast)
    useEffect(() => {
        // We wait for Disk Hydration AND Firebase Auth to resolve
        if (isHydrated && onboardingFinished === null && !userLoading && !isAuthTransitioning) {
            // Seed the latch once from persisted truth.
            // A user is only "finished" if the device milestone is set AND they actually have a fridge.
            // If they have no fridge, we force the latch to false so they are "locked" 
            // into the onboarding container until they explicitly finish the setup.
            const isTrulyFinished = hasCompletedOnboarding && !!user?.fridgeId;
            setOnboardingFinished(isTrulyFinished); 
        }
    }, [isHydrated, hasCompletedOnboarding, userLoading, user?.fridgeId, isAuthTransitioning]);

    // 3. The Stable Release
    // If the user is logged in but their fridge explicitly disappears (e.g. deleted or left),
    // we unlock the latch so they are sent back to the setup screens.
    // We use isHydrated and !userLoading as shields to ensure this only happens 
    // when the app state is stable, not during transient auth changes.
    useEffect(() => {
        if (
            isHydrated &&
            !userLoading &&
            onboardingFinished === true &&
            user &&
            user.fridgeId === null
        ) {
            setOnboardingFinished(false);
        }
    }, [isHydrated, userLoading, user?.fridgeId, onboardingFinished]);

    useEffect(() => {
        if (!isHydrated) {
            Animated.loop(
                Animated.sequence([
                    Animated.spring(bounceAnim, {
                        toValue: 1,
                        friction: 4,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.spring(bounceAnim, {
                        toValue: 0,
                        friction: 4,
                        tension: 40,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        }
    }, [isHydrated]);

    useEffect(() => {
        if (pendingRecipeUrl && navigationRef.isReady()) {
            // Use a small timeout to ensure the navigator is fully settled
            const timer = setTimeout(() => {
                // @ts-ignore
                navigationRef.reset({
                    index: 0,
                    routes: [
                        { name: 'MainTabs', state: { routes: [{ name: 'Meals' }] } },
                        { name: 'ImportRecipe' }
                    ],
                });
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [pendingRecipeUrl, navigationRef]);

    // THE FIX: While Firebase is checking the user (userLoading), 
    // we stay on the Splash screen. This prevents the "flash" of 
    // the wrong screen during logout or login.
    // We ONLY show the splash screen if we haven't decided where to go yet (onboardingFinished === null)
    // or if the user data is still loading for the first time.
    // We DO NOT show it during isAuthTransitioning here because that causes the OnboardingScreen to unmount.
    if (onboardingFinished === null || (userLoading && onboardingFinished === null)) {
        return (
            <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.loadingContainer}>
                <Animated.View
                    style={{
                        transform: [
                            {
                                translateY: bounceAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -30]
                                })
                            },
                            {
                                scale: bounceAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.05]
                                })
                            }
                        ]
                    }}
                >
                    <Image 
                        source={FridgeHiImage} 
                        style={{ width: 120, height: 120 }} 
                        resizeMode="contain" 
                    />
                </Animated.View>
            </LinearGradient>
        );
    }

    // If they haven't finished onboarding, OR they are logged out...
    // We rely ONLY on the onboardingFinished latch to stay in the onboarding flow.
    // This prevents the app from jumping to the main screen the moment a fridge is created,
    // ensuring the user sees the Success/Share screen.
    // We also stay here during auth transitions to prevent unmounting/remounting.
    if (onboardingFinished === false || !user || isAuthTransitioning) {
        return <OnboardingScreen onFinish={() => setOnboardingFinished(true)} />;
    }

    return (
        <NavigationContainer linking={linking} ref={navigationRef}>
            {pairId && <WidgetSynchronizer />}
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen 
                    name="AddRecipe" 
                    component={AddRecipeScreen} 
                    options={{ 
                        presentation: 'modal',
                    }}
                />
                <Stack.Screen 
                    name="ImportRecipe" 
                    component={ImportRecipeScreen} 
                    options={{ 
                        presentation: 'modal',
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#DDF3FF',
    },
});
