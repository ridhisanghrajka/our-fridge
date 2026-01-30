import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase.config';
import { usePairing } from '../hooks/usePairing';
import { useGroceryMemory } from '../hooks/useGroceryMemory';
import { GroceryMemory } from '../types/GroceryMemory';

interface AddItemModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (name: string, quantity?: string, imageUrl?: string, imagePath?: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ visible, onClose, onAdd }) => {
    const { pairId } = usePairing();
    const { suggestions, refreshMemories } = useGroceryMemory(pairId);

    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [imagePath, setImagePath] = useState<string | null>(null); // To track existing storage paths
    const [uploading, setUploading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Refresh memories when modal becomes visible
    React.useEffect(() => {
        if (visible && pairId) {
            refreshMemories();
        }
    }, [visible, pairId, refreshMemories]);

    const activeSuggestions = useMemo(() => {
        if (!visible) return [];
        return suggestions(name);
    }, [name, suggestions, visible]);

    const handleSelectSuggestion = (suggestion: GroceryMemory) => {
        setName(suggestion.displayName);
        if (suggestion.quantity) setQuantity(suggestion.quantity);
        if (suggestion.imageUrl) {
            setImage(suggestion.imageUrl);
            setImagePath(suggestion.imagePath || null);
        }
        setShowSuggestions(false);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setImagePath(null); // New image picked, clear old storage path
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setImagePath(null);
        }
    };

    const handleImagePress = () => {
        Alert.alert(
            'Add Photo',
            'Would you like to take a photo or choose from your library?',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Library', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        // We don't setUploading(true) here anymore because the hook handles it in the background
        try {
            // Immediately call onAdd with the local URI for instant UI update
            onAdd(name.trim(), quantity.trim() || undefined, image || undefined, imagePath || undefined);

            // Reset fields and close instantly
            setName('');
            setQuantity('');
            setImage(null);
            setImagePath(null);
            setShowSuggestions(false);
            onClose();
        } catch (error) {
            console.error("Error saving item:", error);
            alert("Failed to save item. Please try again.");
        }
    };

    const handleCancel = () => {
        setName('');
        setQuantity('');
        setImage(null);
        setImagePath(null);
        setShowSuggestions(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />

                <View style={styles.modal}>
                    <Text style={styles.title}>Add Item</Text>

                    <Text style={styles.label}>Item Name *</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Milk"
                            placeholderTextColor="#A89B8F"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            autoFocus
                        />

                        {showSuggestions && activeSuggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                {activeSuggestions.map((suggestion) => (
                                    <TouchableOpacity
                                        key={suggestion.id}
                                        style={styles.suggestionItem}
                                        onPress={() => handleSelectSuggestion(suggestion)}
                                    >
                                        <View style={styles.suggestionContent}>
                                            {suggestion.imageUrl && (
                                                <Image source={{ uri: suggestion.imageUrl }} style={styles.suggestionImage} />
                                            )}
                                            <View style={styles.suggestionTextContainer}>
                                                <Text style={styles.suggestionName}>{suggestion.displayName}</Text>
                                                {suggestion.quantity && (
                                                    <Text style={styles.suggestionQuantity}>{suggestion.quantity}</Text>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <Text style={styles.label}>Quantity (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 2L"
                        placeholderTextColor="#A89B8F"
                        value={quantity}
                        onChangeText={setQuantity}
                    />

                    <Text style={styles.label}>Image (optional)</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={handleImagePress}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Text style={styles.imagePlaceholderText}>+ Add Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel} disabled={uploading}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.saveButton, (!name.trim() || uploading) && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={!name.trim() || uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modal: {
        backgroundColor: '#FFF7EE',
        borderRadius: 24,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    title: {
        fontSize: 22, // Reduced from 24 to match section titles
        fontFamily: 'Poppins-SemiBold',
        color: '#3D2E25',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 12, // Reduced from 14
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: '#6B4B3E',
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#3D2E25',
        borderWidth: 2,
        borderColor: '#E3D2C3',
    },
    inputContainer: {
        zIndex: 1000,
        position: 'relative',
    },
    suggestionsContainer: {
        backgroundColor: '#FFFBF7',
        borderRadius: 16,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#E3D2C3',
        maxHeight: 200,
        overflow: 'hidden',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
    },
    suggestionItem: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F5EEE6',
    },
    suggestionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    suggestionImage: {
        width: 32,
        height: 32,
        borderRadius: 6,
        marginRight: 12,
        backgroundColor: '#F5EEE6',
    },
    suggestionImagePlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 6,
        marginRight: 12,
        backgroundColor: '#F5EEE6',
        borderWidth: 1,
        borderColor: '#E3D2C3',
        borderStyle: 'dashed',
    },
    suggestionTextContainer: {
        flex: 1,
    },
    suggestionName: {
        fontSize: 15,
        fontFamily: 'Inter-SemiBold',
        color: '#3D2E25',
    },
    suggestionQuantity: {
        fontSize: 12,
        color: '#A89B8F',
        marginTop: 1,
        fontFamily: 'Inter-Medium',
    },
    row: {
        flexDirection: 'row',
    },
    imagePicker: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E3D2C3',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: '#A89B8F',
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    button: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#E3D2C3',
    },
    saveButton: {
        backgroundColor: '#6B4B3E',
    },
    disabledButton: {
        opacity: 0.5,
    },
    cancelButtonText: {
        color: '#3D2E25',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
});
