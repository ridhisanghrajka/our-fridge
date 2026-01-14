import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FridgeScreen } from '../screens/FridgeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PairingScreen } from '../screens/PairingScreen';
import { usePairing } from '../hooks/usePairing';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
    const { pairId, loading } = usePairing();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6B4B3E" />
            </View>
        );
    }

    if (!pairId) {
        return <PairingScreen />;
    }

    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    tabBarStyle: {
                        position: 'absolute',
                        bottom: 30,
                        backgroundColor: '#F5F5F5', // Neutral light grey
                        borderRadius: 30,
                        borderTopWidth: 0,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15, // Softer shadow
                        shadowRadius: 8,
                        height: 60,
                        marginHorizontal: 80,
                        paddingBottom: 0,
                        left: 0,
                        right: 0,
                    },
                    tabBarActiveTintColor: '#6B4B3E',
                    tabBarInactiveTintColor: '#A89B8F',
                    tabBarShowLabel: true,
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: 'bold',
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
                        fontWeight: 'bold',
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
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        tabBarIcon: ({ color }) => (
                            <Svg width={24} height={24} viewBox="0 0 24 24">
                                <Path fill={color} d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.4 3.4 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.4 3.4 0 0 0 15 11a3.5 3.5 0 0 0 0-7" />
                            </Svg>
                        ),
                    }}
                />
            </Tab.Navigator>
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
