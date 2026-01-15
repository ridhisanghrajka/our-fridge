import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { GroceryItem } from '../types/GroceryItem';

interface GroceryListRowProps {
    item: GroceryItem;
    onToggle: () => void;
    onPress?: () => void;
    onDelete?: () => void;
    scale?: number;
    rowHeight?: number;
}

export const GroceryListRow: React.FC<GroceryListRowProps> = ({ item, onToggle, onPress, onDelete, scale = 1, rowHeight }) => {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                { paddingVertical: 8 * scale }, // Reduced from 12 to help fit
                rowHeight ? { height: rowHeight } : {}
            ]}
            onPress={onPress || onToggle}
            activeOpacity={0.7}
        >
            {/* Checkbox */}
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                style={[styles.checkbox, {
                    width: 28 * scale, // Reduced from 32 to help fit better
                    height: 28 * scale,
                    borderRadius: 8 * scale,
                    borderWidth: item.isDone ? 0 : 2.5 * scale,
                    marginRight: 12 * scale // Reduced from 16
                }, item.isDone && styles.checkboxDone]}
            >
                {item.isDone && (
                    <Svg width={14 * scale} height={14 * scale} viewBox="0 0 24 24">
                        <Path
                            d="M20.285 2L9 13.567 3.714 8.556 0 12.272 9 21 24 5.715z"
                            fill="#FFF7EE"
                        />
                    </Svg>
                )}
            </TouchableOpacity>

            {/* Content with Underline */}
            <View style={[styles.contentContainer, { borderBottomWidth: 2 * scale, paddingBottom: 8 * scale }]}>
                {item.emoji && <Text style={[styles.emoji, { fontSize: 20 * scale, marginRight: 8 * scale }]}>{item.emoji}</Text>}

                <Text style={[styles.name, { fontSize: 18 * scale }, item.isDone && styles.nameDone]} numberOfLines={1}>
                    {item.name}
                </Text>

                {item.quantity && (
                    <Text style={[styles.quantity, { fontSize: 16 * scale, marginLeft: 8 * scale }, item.isDone && styles.quantityDone]}>
                        {item.quantity}
                    </Text>
                )}

                {item.imageUrl && (
                    <Image 
                        source={{ uri: item.imageUrl }} 
                        style={[styles.itemImage, { width: 24 * scale, height: 24 * scale, marginLeft: 8 * scale, borderRadius: 4 * scale }]} 
                        contentFit="cover"
                        transition={200}
                    />
                )}
            </View>

            {/* Delete Cross */}
            {onDelete && (
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation(); // Don't toggle when deleting
                        onDelete();
                    }}
                    style={[styles.deleteButton, { padding: 4 * scale, marginLeft: 4 * scale }]}
                    activeOpacity={0.6}
                >
                    <View style={[styles.crossContainer, { width: 22 * scale, height: 22 * scale, borderRadius: 11 * scale }]}>
                        <Text style={[styles.crossText, { fontSize: 13 * scale }]}>✕</Text>
                    </View>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // Increased spacing
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 32, // Slightly larger to match SVG ref
        height: 32,
        borderRadius: 10, // Rounded square (squircleish)
        borderWidth: 3,
        borderColor: 'rgba(107, 75, 62, 0.35)', // Softer brown border
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    checkboxDone: {
        backgroundColor: '#6B4B3E',
        borderColor: 'transparent',
        borderWidth: 0,
        opacity: 0.8,
    },
    checkmark: {
        width: 14,
        height: 14,
        borderRadius: 4,
        backgroundColor: '#FFF7EE',
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2, // Thicker line like SVG
        borderBottomColor: 'rgba(107, 75, 62, 0.15)', // Matching SVG line color logic
        paddingBottom: 8, // Space between text and line
    },
    itemImage: {
        backgroundColor: '#E3D2C3',
    },
    emoji: {
        fontSize: 20,
        marginRight: 8,
    },
    name: {
        flex: 1,
        fontSize: 18, // Slightly larger handwritten feel?
        color: '#5D4037', // Darker brown text
        fontWeight: '500',
    },
    nameDone: {
        opacity: 0.4,
        textDecorationLine: 'line-through',
    },
    quantity: {
        fontSize: 16,
        color: '#8D6E63',
        marginLeft: 8,
        fontWeight: '500',
    },
    quantityDone: {
        opacity: 0.4,
        textDecorationLine: 'line-through',
    },
    deleteButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    crossContainer: {
        backgroundColor: 'rgba(107, 75, 62, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    crossText: {
        color: '#6B4B3E',
        fontWeight: '900',
        textAlign: 'center',
        marginTop: -1, // Visual center tweak
    },
});
