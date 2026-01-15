import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, TouchableOpacity, ScrollView, Text } from 'react-native';

interface MagnetPickerProps {
    visible: boolean;
    selectedMagnetType: string;
    onSelectMagnet: (type: string) => void;
}

/**
 * MagnetPicker Component
 * Displays available country magnet options with descriptive labels
 */
export const MagnetPicker: React.FC<MagnetPickerProps> = ({
    visible,
    selectedMagnetType,
    onSelectMagnet
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

    const magnets = [
        { id: 'uk', name: 'UK', source: require('../assets/uk_magnet.png') },
        { id: 'germany', name: 'Germany', source: require('../assets/germany_magnet.png') },
        { id: 'usa', name: 'USA', source: require('../assets/usa_magnet.png') },
        { id: 'canada', name: 'Canada', source: require('../assets/canada_magnet.png') },
        { id: 'australia', name: 'Australia', source: require('../assets/australia_magnet.png') },
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
                    return (
                        <TouchableOpacity
                            key={magnet.id}
                            onPress={() => onSelectMagnet(magnet.id)}
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
    magnetLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#8B6B5E',
        textAlign: 'center',
    },
    magnetLabelSelected: {
        color: '#6B4B3E',
        fontWeight: '700',
    },
});
