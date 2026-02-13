import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePairing } from '../hooks/usePairing';
import Svg, { Path, G, Defs, Use, ClipPath, Rect } from 'react-native-svg';
import { useGroceryItems } from '../hooks/useGroceryItems';
import { useSharedNote } from '../hooks/useSharedNote';
import { useNavigation } from '@react-navigation/native';
import { FridgeSVG } from '../components/FridgeSVG';
import { FridgeHandleSVG } from '../components/FridgeHandleSVG';
import { NoteCanvas } from '../components/NoteCanvas';
import { NoteModal } from './NoteModal';
import { AddItemModal } from './AddItemModal';
import { NotepadSVG } from '../components/NotepadSVG';
import { GroceryListRow } from '../components/GroceryListRow';
import { EditItemModal } from './EditItemModal';
import { GroceryItem } from '../types/GroceryItem';
import { presentPaywall } from '../services/billing';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const FridgeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { pairId, userName, user, pair, isPremium, cachedFridgeName } = usePairing();
    const { items, loading: itemsLoading, addItem, toggleItem, deleteItem, updateItem } = useGroceryItems(pairId, user);
    const { note, updateNote } = useSharedNote(pairId, user);
    const [addItemVisible, setAddItemVisible] = useState(false);
    const [writeNoteVisible, setWriteNoteVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
    const [scrollPercent, setScrollPercent] = useState(0);
    const [isListExpanded, setIsListExpanded] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;

    const toggleExpand = (expand: boolean) => {
        setIsListExpanded(expand);
        Animated.spring(expandAnim, {
            toValue: expand ? 1 : 0,
            useNativeDriver: false,
            friction: 8,
            tension: 40
        }).start();
    };

    // Calculate notepad title
    const notepadTitle = pair?.fridgeName || cachedFridgeName || (userName ? `${userName}'s Fridge` : "Our Fridge");

    const handleAddItem = async (name: string, quantity?: string, imageUrl?: string, imagePath?: string) => {
        await addItem(name, undefined, quantity, imageUrl, imagePath);
    };

    const handleUpdateItem = async (itemId: string, updates: any) => {
        await updateItem(itemId, updates);
    };

    const handleUpdateNote = async (content: string) => {
        await updateNote(content);
    };

    // Parse canvas elements safely
    const memoizedElements = useMemo(() => {
        if (!note?.content) return [];
        try {
            const parsed = JSON.parse(note.content);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing note canvas content:", e);
            return [];
        }
    }, [note?.content]);

    // Calculate scale and position to match FridgeSVG logic
    const originalWidth = 1280;
    const originalHeight = 2532;
    const scale = Math.min(screenWidth / originalWidth, screenHeight / originalHeight);

    // Calculate centered fridge position
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;
    const fridgeLeft = (screenWidth - scaledWidth) / 2;
    const fridgeTop = (screenHeight - scaledHeight) / 2;

    // Fridge Body Geometry (from FridgeSVG)
    // Body is at x=50, width=1100. Center of body is 50 + 550 = 600.
    const bodyCenterX = fridgeLeft + (600 * scale);
    const bodyWidth = 1100 * scale;

    // Notepad positions
    // We want width to be 85% of the fridge body
    const notepadWidth = bodyWidth * 0.92; // Slightly wider to fill body better
    const notepadHeight = notepadWidth * (1600 / 1000); // New aspect ratio

    // Center notepad on the fridge body
    const notepadLeft = bodyCenterX - (notepadWidth / 2);

    // Position notepad from top of Fridge Body (y=300) to start from top
    const notepadTop = fridgeTop + (300 * scale);

    // List area layout (relative to notepad)
    // 360/1600 = 0.225 -> changed to 0.20 to move up
    const listTop = notepadTop + notepadHeight * 0.20;
    // 640/1600 = 0.4
    const listHeight = notepadHeight * 0.4;
    const listLeft = notepadLeft + notepadWidth * 0.10; // Centered on wider paper
    const listWidth = notepadWidth * 0.80; // 800/1000

    const expandedListHeight = listHeight + (notepadHeight * 0.3) + (notepadHeight * 0.04375); // Covers list + note area + gap

    const animatedListHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [listHeight, expandedListHeight]
    });

    // Note area layout
    // 1030/1600 = 0.64375 -> Adjusted to 0.66 to give more space for "Show more"
    const noteTop = notepadTop + notepadHeight * 0.645;
    // 480/1600 = 0.3 -> Adjusted slightly to maintain bottom position
    const noteHeight = notepadHeight * 0.32;
    const noteLeft = notepadLeft + notepadWidth * 0.10; // Centered on wider paper
    const noteWidth = notepadWidth * 0.80; // 800/1000

    // Buttons - Position relative to Divider (y=1899)
    // Let's place them at y=1950 scale
    const buttonsTop = fridgeTop + (1950 * scale);

    // Handle positions (centered vertically on body)
    // Body is from y=300 to y=2160. Midpoint = 1230.
    const handleWidth = 390 * scale;
    const handleHeight = 150 * scale;
    const handleTop = fridgeTop + (1230 * scale) - (handleHeight / 2);
    const handleLeft = fridgeLeft + (31.5 * scale);

    // Responsive scaling factor for text/padding/etc (normalized to phone scale ~0.35)
    const rScale = scale / 0.35;

    return (
        <LinearGradient
            colors={['#DDF3FF', '#FFF6EA']} // Match SVG sky gradient
            style={styles.container}
        >
            {/* Fridge background */}
            <View style={styles.fridgeContainer}>
                <FridgeSVG />
            </View>

            {/* Background overlay to catch taps outside the expanded list */}
            {isListExpanded && (
                <TouchableOpacity 
                    style={StyleSheet.absoluteFill} 
                    activeOpacity={1} 
                    onPress={() => toggleExpand(false)} 
                />
            )}

            {/* Notepad overlay */}
            <View style={[styles.notepadContainer, { left: notepadLeft, top: notepadTop, width: notepadWidth, height: notepadHeight, overflow: 'visible' }]}>
                <NotepadSVG width={notepadWidth} height={notepadHeight} title={notepadTitle} />
            </View>

            {/* Door Handle - Overlaps Notepad */}
            <View style={{ position: 'absolute', left: handleLeft, top: handleTop, width: handleWidth, height: handleHeight }}>
                <FridgeHandleSVG width={handleWidth} height={handleHeight} />
            </View>

            {/* Grocery list overlay */}
            <Animated.View style={[styles.listContainer, { left: listLeft, top: listTop, width: listWidth, height: animatedListHeight, backgroundColor: isListExpanded ? '#F6EDE3' : 'transparent', borderRadius: isListExpanded ? 16 * rScale : 0, zIndex: isListExpanded ? 100 : 1 }]}>
                {itemsLoading && items.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <ActivityIndicator size="small" color="#6B4B3E" />
                    </View>
                ) : items.length === 0 ? (
                    <TouchableOpacity
                        style={styles.emptyStateContainer}
                        onPress={() => navigation.navigate('Profile')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.emptyStateTitle, { fontSize: 18 * rScale }]}>Fridge is empty! 🥛</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <FlatList
                            data={items}
                            extraData={items}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <GroceryListRow
                                    item={item}
                                    onToggle={async () => {
                                        if (!isPremium) {
                                            await presentPaywall(user?.uid);
                                            return;
                                        }
                                        toggleItem(item.id, item.isDone);
                                    }}
                                    onPress={async () => {
                                        if (!isPremium) {
                                            await presentPaywall(user?.uid);
                                            return;
                                        }
                                        setEditingItem(item);
                                    }}
                                    onDelete={async () => {
                                        if (!isPremium) {
                                            await presentPaywall(user?.uid);
                                            return;
                                        }
                                        deleteItem(item.id);
                                    }}
                                    scale={rScale}
                                    rowHeight={listHeight / 5}
                                />
                            )}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[styles.listContent, isListExpanded && { paddingBottom: 20 * rScale, paddingTop: 10 * rScale }]}
                            onScroll={(e) => {
                                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                                const maxScroll = contentSize.height - layoutMeasurement.height;
                                if (maxScroll <= 0) {
                                    setScrollPercent(0);
                                } else {
                                    const scrollFraction = contentOffset.y / maxScroll;
                                    setScrollPercent(Math.max(0, Math.min(1, scrollFraction)));
                                }
                            }}
                            scrollEventThrottle={16}
                        />
                        {isListExpanded && (
                            <TouchableOpacity 
                                style={[styles.expandedCloseButton, { paddingVertical: 12 * rScale }]} 
                                onPress={() => toggleExpand(false)}
                            >
                                <Text style={[styles.showMoreText, { fontSize: 14 * rScale }]}>Close</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </Animated.View>

            {/* "Show more" button in the gap - Only visible when NOT expanded */}
            {!isListExpanded && items.length > 5 && (
                <TouchableOpacity 
                    style={{
                        position: 'absolute',
                        top: listTop + listHeight, 
                        left: listLeft,
                        width: listWidth,
                        height: noteTop - (listTop + listHeight),
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        paddingTop: 4 * rScale,
                        zIndex: 5,
                    }} 
                    onPress={() => toggleExpand(true)}
                    activeOpacity={0.6}
                >
                    <Text style={[styles.showMoreText, { fontSize: 14 * rScale }]}>Show more</Text>
                </TouchableOpacity>
            )}

            {/* Custom Aesthetic Scrollbar - Visible if more than 5 items */}
            {items.length > 5 && (
                <View style={{
                    position: 'absolute',
                    left: listLeft + listWidth + (6 * rScale),
                    top: listTop + (listHeight * 0.05),
                    height: listHeight * 0.9,
                    width: 6 * rScale,
                    backgroundColor: 'rgba(107, 75, 62, 0.05)', // Almost invisible track
                    borderRadius: 3 * rScale,
                }}>
                    {/* Scroll Thumb */}
                    <View style={{
                        position: 'absolute',
                        top: scrollPercent * (listHeight * 0.9 - (listHeight * 0.25)), 
                        width: '100%',
                        height: listHeight * 0.25, // Slightly taller thumb
                        backgroundColor: '#6B4B3E',
                        borderRadius: 3 * rScale,
                        opacity: 0.25, // Subtle but clearly a "physical" element
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 1,
                        elevation: 1,
                    }} />
                </View>
            )}

            {/* Shared note overlay */}
            <TouchableOpacity
                style={[styles.noteContainer, { left: noteLeft, top: noteTop, width: noteWidth, height: noteHeight }]}
                onPress={async () => {
                    if (!isPremium) {
                        await presentPaywall(user?.uid);
                        return;
                    }
                    setWriteNoteVisible(true);
                }}
                activeOpacity={0.7}
            >
                <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
                    <NoteCanvas
                        width={noteWidth}
                        height={noteHeight}
                        elements={memoizedElements}
                        currentTool="pen" // Doesn't matter for readOnly
                        onElementsChange={() => { }}
                        readOnly={true}
                    />
                </View>
                {memoizedElements.length === 0 && (
                    <Text style={[styles.noteText, { fontSize: 14 * rScale, lineHeight: 20 * rScale }]}>
                        Tap to leave a note...
                    </Text>
                )}
            </TouchableOpacity>

            {/* Action buttons - centered on body */}
            <View style={[styles.buttonContainer, { top: buttonsTop, left: bodyCenterX - bodyWidth / 2, width: bodyWidth, gap: 20 * rScale }]}>
                <TouchableOpacity 
                    style={[styles.actionButton, { borderRadius: 16 * rScale, paddingVertical: 12 * rScale, paddingHorizontal: 20 * rScale }]} 
                    onPress={async () => {
                    if (!isPremium) {
                        await presentPaywall(user?.uid);
                        return;
                    }
                    setAddItemVisible(true);
                }}
                >
                    <Svg width={24 * rScale} height={24 * rScale} viewBox="0 0 24 24">
                        <G fill="none" fillRule="evenodd">
                            <Path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z" />
                            <Path fill="#FFFFFF" d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4v4a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h4z" />
                        </G>
                    </Svg>
                    <Text style={[styles.buttonText, { fontSize: 16 * rScale }]}>Add Item</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, { borderRadius: 16 * rScale, paddingVertical: 12 * rScale, paddingHorizontal: 20 * rScale }]} 
                    onPress={async () => {
                        if (!isPremium) {
                            await presentPaywall();
                            return;
                        }
                        setWriteNoteVisible(true);
                    }}
                >
                    <Svg width={24 * rScale} height={24 * rScale} viewBox="0 0 128 128">
                        <Defs>
                            <Path id="SVGG9rYnebu" d="M17.73 68.85L.63 121.91s-.54 2.54.92 3.44s2.9.17 2.9.17l53.71-20.37l-11.01-30.07z" />
                        </Defs>
                        <Use fill="#fcd4b5" href="#SVGG9rYnebu" />
                        <ClipPath id="SVGf7b5Yc3H">
                            <Use href="#SVGG9rYnebu" />
                        </ClipPath>
                        <Path fill="#006ca2" d="M4.31 106.58c-1.51 4.82-2.99 9.64-4.05 13.28c-.32 1.1-.6 2.08-.84 2.93c-.48 1.73-.32 3.76.15 4.19c.78.71 1.6 1.01 2.45.9l.19-.04c1.76-.36 8.76-3.08 16.75-6.38c-2.81-6.25-8.99-12.32-14.65-14.88" clipPath="url(#SVGf7b5Yc3H)" />
                        <Path fill="#bdcf46" d="M119.69 36.9c-.04-.39-.08-.77-.11-1.14c-.07-1.15-.2-2.26-.32-3.37c-.13-1.15-.26-2.29-.33-3.45l-.02-.33c0-.07-.01-.13-.01-.2L56.17 85.92c.32 1.38.4 4.12.48 6.8c.06 1.96.11 3.82.26 4.91c.03.11.4.08 1.26-.77c6.62-6.48 42.61-39.02 54.43-49.71l3.72-3.35c1.48-1.31 3.31-2.93 3.48-4.74c.06-.67-.03-1.42-.11-2.16M95.23 10.39c.64-.04 1.28-.11 1.92-.19c.6-.07 1.16-.12 1.72-.16L36.94 68.12c-.2-.07-.39-.14-.6-.19c-1.36-.32-2.79-.4-4.17-.47c-1.25-.06-2.43-.12-3.57-.35c.18-.21.53-.54 1.21-1.01c1.17-.83 5.78-5.19 10.25-9.42c2.21-2.08 4.34-4.1 5.9-5.54l6.26-5.78c10.11-9.36 25.4-23.5 31.61-28.95c.56-.49 1.1-.99 1.63-1.48c1.37-1.27 2.66-2.46 4.23-3.5c.61-.4 1.15-.49 1.91-.62l.39-.07c1.1-.21 2.21-.29 3.24-.35M40.01 81c-.3-2.53-.56-7.37-.42-8.86c.04-.42 0-.83-.08-1.21l63.66-59.71c.04.03.08.05.12.09c3.19 2.94 11.62 10.92 13.92 13.49L53.18 83.5c-2.04-.49-4.28-.85-6.84-1.09c-.26-.03-.65-.04-1.13-.06c-1.21-.05-3.04-.13-4.19-.46c-.9-.26-1-.89-1.01-.89" />
                        <Path fill="#757f3f" d="M127.42 32.53c-.11-2.6-.4-5.28-.86-7.96l-.1-.66c-.17-1.13-.36-2.42-1.06-3.3c-2.2-2.76-5.23-5.56-8.18-8.17c-1-.88-1.99-1.82-2.97-2.75c-2.13-2.01-4.33-4.09-6.71-5.72c-1.74-1.18-3.98-1.76-6.88-1.76c-2.38 0-4.9.39-7.13.74c-1.13.17-2.2.34-3.19.45c-1.61.17-3.22.86-4.92 2.11c-.42.29-20.13 18.35-49.59 45.36c-5.54 5.09-16.77 14.16-17.81 16.65c-.37.87-.43 1.79-.03 2.74c1.93 4.53 9.11 2.93 12.97 3.54c.46.07 1.54.13 1.8.61c.57 1 1.11 9.53 1.68 11.29c1.23 3.74 6.07 3.17 9.2 3.28c1.19.04 5.48.13 6.72 1.13c.43.34.4 1.45.44 1.93c.11 1.3.12 2.61.11 3.91c0 1.41-.04 2.82-.04 4.24c0 .9.17 2.27.59 3.08c.63 1.24 1.94 2.04 3.22 2.36c4.04 1.03 6.46-2.27 9.1-4.59l.9-.79c1.32-1.17 2.62-2.33 3.98-3.47c10.14-8.58 31.38-28.11 44.07-39.77l4.15-3.82c1.85-1.69 3.68-3.39 5.49-5.12c.3-.29.64-.58.98-.88c1.42-1.25 3.03-2.66 3.42-4.57c.59-2.95.81-6.35.65-10.09m-91.09 35.4c-1.36-.32-2.79-.4-4.17-.47c-1.25-.06-2.43-.12-3.57-.35c.18-.21 7-6.2 11.46-10.43c2.21-2.08 4.34-4.1 5.9-5.54l6.26-5.78c10.11-9.36 25.4-23.5 31.61-28.95c.56-.49 1.1-.99 1.63-1.48c1.37-1.27 2.66-2.46 4.23-3.5c.61-.4 1.15-.49 1.91-.62l.39-.07c1.1-.2 2.21-.29 3.25-.35c.64-.04 1.28-.11 1.92-.19c.6-.07 1.16-.12 1.72-.16L36.94 68.12c-.2-.07-.39-.14-.61-.19m10.02 14.48c-.26-.03-.65-.04-1.13-.06c-1.21-.05-3.04-.13-4.19-.46c-.91-.26-1.01-.89-1.02-.89c-.3-2.53-.56-7.37-.42-8.86c.04-.42 0-.83-.08-1.21l63.66-59.71c.04.03.08.05.12.09c3.19 2.94 11.62 10.92 13.92 13.49L53.18 83.5c-2.04-.5-4.28-.85-6.83-1.09m73.45-43.35c-.17 1.8-2 3.43-3.48 4.74l-3.72 3.35c-11.83 10.69-47.81 43.23-54.43 49.71c-.86.85-1.22.88-1.26.77c-.14-1.08-.2-2.94-.26-4.91c-.08-2.67-.16-5.42-.48-6.8l62.74-57.51c0 .06.01.13.01.2l.02.33c.07 1.17.2 2.3.33 3.45c.12 1.11.25 2.22.32 3.37c.03.37.06.76.11 1.14c.07.74.16 1.49.1 2.16" />
                    </Svg>
                    <Text style={[styles.buttonText, { fontSize: 16 * rScale }]}>Write Note</Text>
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <AddItemModal
                visible={addItemVisible}
                onClose={() => setAddItemVisible(false)}
                onAdd={handleAddItem}
            />

            <NoteModal
                visible={writeNoteVisible}
                initialContent={note?.content || ''}
                onClose={() => setWriteNoteVisible(false)}
                onSave={handleUpdateNote}
                rScale={rScale}
            />

            <EditItemModal
                visible={!!editingItem}
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleUpdateItem}
                onDelete={deleteItem}
            />
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor removed, handled by LinearGradient
    },
    fridgeContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notepadContainer: {
        position: 'absolute',
    },
    listContainer: {
        position: 'absolute',
    },
    listContent: {
        paddingVertical: 4,
    },
    noteContainer: {
        position: 'absolute',
        justifyContent: 'center',
        padding: 12,
    },
    noteText: {
        fontSize: 14,
        color: '#6B4B3E',
        fontFamily: 'Inter-Regular',
        fontStyle: 'italic',
        lineHeight: 20,
        textAlign: 'center',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontFamily: 'Inter-Medium',
        color: '#6B4B3E',
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 18,
    },
    buttonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        paddingHorizontal: 40,
    },
    actionButton: {
        backgroundColor: '#6B4B3E',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 5,
    },
    buttonEmoji: {
        fontSize: 20,
        marginRight: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    showMoreButton: {
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: 'rgba(107, 75, 62, 0.05)',
        borderRadius: 8,
    },
    showMoreText: {
        color: '#6B4B3E',
        fontFamily: 'Inter-SemiBold',
        opacity: 0.7,
        textDecorationLine: 'underline',
    },
    closeButton: {
        position: 'absolute',
        zIndex: 101,
    },
    closeIconContainer: {
        backgroundColor: 'rgba(107, 75, 62, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIconText: {
        color: '#6B4B3E',
        fontFamily: 'Inter-Bold',
    },
    expandedCloseButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(107, 75, 62, 0.1)',
        paddingBottom: 10,
    },
});
