import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, TouchableOpacity, ScrollView, Text } from 'react-native';
import { usePairing } from '../hooks/usePairing';
import Svg, { Path } from 'react-native-svg';

const LockIcon = ({ size = 12, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 17V19M7 10H17C18.1046 10 19 10.8954 19 12V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V12C5 10.8954 5.89543 10 7 10ZM12 6C13.1046 6 14 6.89543 14 8V10H10V8C10 6.89543 10.8954 6 12 6Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

interface MagnetPickerProps {
    visible: boolean;
    selectedMagnetType: string;
    onSelectMagnet: (type: string) => void;
    onProSelect: () => void;
}

/**
 * MagnetPicker Component
 * Displays available country magnet options with descriptive labels
 */
export const MagnetPicker: React.FC<MagnetPickerProps> = ({
    visible,
    selectedMagnetType,
    onSelectMagnet,
    onProSelect
}) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visible ? 1 : 0,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [visible]);

    if (!visible && slideAnim.__getValue() === 0) {
        return null;
    }

    const animatedHeight = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 95], // Reduced from 110
    });

    const animatedOpacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const { isPremium } = usePairing();

    const magnets = [
        { id: 'uk', name: 'UK', source: require('../assets/uk_magnet.png'), isPro: false },
        { id: 'germany', name: 'Germany', source: require('../assets/germany_magnet.png'), isPro: false },
        { id: 'usa', name: 'USA', source: require('../assets/usa_magnet.png'), isPro: true },
        { id: 'canada', name: 'Canada', source: require('../assets/canada_magnet.png'), isPro: true },
        { id: 'australia', name: 'Australia', source: require('../assets/australia_magnet.png'), isPro: true },
    ];

    return (
        <Animated.View 
            style={[
                styles.container, 
                { 
                    height: animatedHeight,
                    opacity: animatedOpacity 
                }
            ]}
        >
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pickerContent}
            >
                {magnets.map((magnet) => {
                    const isSelected = selectedMagnetType === magnet.id;
                    const showLock = magnet.isPro && !isPremium;
                    
                    return (
                        <TouchableOpacity
                            key={magnet.id}
                            onPress={() => {
                                if (showLock) {
                                    onProSelect();
                                } else {
                                    onSelectMagnet(magnet.id);
                                }
                            }}
                            style={[
                                styles.magnetTile,
                                isSelected && styles.magnetTileSelected
                            ]}
                            activeOpacity={0.7}
                        >
                            <View style={styles.imageContainer}>
                                <Image
                                    source={magnet.source}
                                    style={styles.magnetImage}
                                    resizeMode="contain"
                                />
                                {showLock && (
                                    <View style={styles.lockBadge}>
                                        <LockIcon />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.magnetLabel, isSelected && styles.magnetLabelSelected]}>
                                {magnet.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F3E3D7',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    pickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
    },
    magnetTile: {
        width: 80, // Reduced from 100
        height: 72, // Reduced from 85
        backgroundColor: 'transparent',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: 'transparent', // Hide border unless selected or hovered
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0, // Reduced from 4
    },
    magnetTileSelected: {
        borderColor: '#6B4B3E',
        borderWidth: 2,
        backgroundColor: 'rgba(107, 75, 62, 0.1)', // Subtle brown highlight
        transform: [{ scale: 1.05 }],
    },
    imageContainer: {
        width: '100%',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2, // Reduced from 4
    },
    magnetImage: {
        width: '100%',
        height: '100%',
    },
    lockBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FFD700',
        borderRadius: 8,
        padding: 2,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    magnetLabel: {
        fontSize: 10,
        fontFamily: 'Inter-SemiBold',
        color: '#8B6B5E',
        textAlign: 'center',
    },
    magnetLabelSelected: {
        color: '#6B4B3E',
        fontFamily: 'Inter-Bold',
    },
});
