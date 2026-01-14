import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroceryItem } from '../types/GroceryItem';

interface GroceryListRowProps {
    item: GroceryItem;
    onToggle: () => void;
    scale?: number;
}

export const GroceryListRow: React.FC<GroceryListRowProps> = ({ item, onToggle, scale = 1 }) => {
    return (
        <TouchableOpacity style={[styles.container, { paddingVertical: 12 * scale }]} onPress={onToggle} activeOpacity={0.7}>
            {/* Checkbox */}
            <View style={[styles.checkbox, {
                width: 32 * scale,
                height: 32 * scale,
                borderRadius: 10 * scale,
                borderWidth: 3 * scale,
                marginRight: 16 * scale
            }, item.isDone && styles.checkboxDone]}>
                {item.isDone && <View style={[styles.checkmark, { width: 14 * scale, height: 14 * scale, borderRadius: 4 * scale }]} />}
            </View>

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
            </View>
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
        borderColor: '#6B4B3E',
        opacity: 0.6,
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
});
