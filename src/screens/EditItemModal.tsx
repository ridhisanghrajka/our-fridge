import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import { GroceryItem } from '../types/GroceryItem';

interface EditItemModalProps {
    visible: boolean;
    item: GroceryItem | null;
    onClose: () => void;
    onSave: (itemId: string, updates: { name: string; quantity?: string; imageUrl?: string; imagePath?: string }) => void;
    onDelete: (itemId: string) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ visible, item, onClose, onSave, onDelete }) => {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [newImageUri, setNewImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (item) {
            setName(item.name);
            setQuantity(item.quantity || '');
            setImage(item.imageUrl || null);
            setNewImageUri(null);
            setIsEditing(false);
        }
    }, [item, visible]);

    const pickImage = async () => {
        if (!isEditing) return;
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewImageUri(result.assets[0].uri);
            setImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        if (!isEditing) return;
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
            setNewImageUri(result.assets[0].uri);
            setImage(result.assets[0].uri);
        }
    };

    const handleImagePress = () => {
        if (!isEditing) return;
        Alert.alert(
            'Change Photo',
            'Would you like to take a photo or choose from your library?',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Library', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSave = async () => {
        if (!item || !name.trim()) return;

        setUploading(true);
        try {
            let imageUrl = item.imageUrl;
            let imagePath = item.imagePath;

            if (newImageUri) {
                const response = await fetch(newImageUri);
                const blob = await response.blob();
                const filename = `grocery-items/${Date.now()}-${name.trim()}.jpg`;
                const storageRef = ref(storage, filename);
                
                await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(storageRef);
                imagePath = filename;
            }

            await onSave(item.id, {
                name: name.trim(),
                quantity: quantity.trim() || '',
                imageUrl: imageUrl || '',
                imagePath: imagePath || '',
            });
            onClose();
        } catch (error) {
            console.error("Error updating item:", error);
            alert("Failed to save changes. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    if (!item) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <View style={styles.modal}>
                    {/* Close Button Top Right */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Item Details</Text>

                        <Text style={styles.label}>Item Name</Text>
                        <TextInput
                            style={[styles.input, !isEditing && styles.readOnlyInput]}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g., Milk"
                            placeholderTextColor="#A89B8F"
                            editable={isEditing}
                        />

                        <Text style={styles.label}>Quantity</Text>
                        <TextInput
                            style={[styles.input, !isEditing && styles.readOnlyInput]}
                            value={quantity}
                            onChangeText={setQuantity}
                            placeholder="e.g., 2L"
                            placeholderTextColor="#A89B8F"
                            editable={isEditing}
                        />

                        <Text style={styles.label}>Image</Text>
                        {/* Large Image Preview */}
                        <TouchableOpacity 
                            style={styles.largeImageContainer} 
                            onPress={handleImagePress}
                            activeOpacity={isEditing ? 0.7 : 1}
                        >
                            {image ? (
                                <Image 
                                    source={{ uri: image }} 
                                    style={styles.largeImage} 
                                    contentFit="cover"
                                    transition={200}
                                />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Text style={styles.imagePlaceholderText}>No Image</Text>
                                    <Text style={styles.imagePlaceholderSubtext}>Tap to add photo</Text>
                                </View>
                            )}
                            {isEditing && (
                                <View style={styles.editBadge}>
                                    <Text style={styles.editBadgeText}>Change Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.buttonRow}>
                            {isEditing ? (
                                <>
                                    <TouchableOpacity 
                                        style={[styles.button, styles.cancelEditButton]} 
                                        onPress={() => {
                                            if (item) {
                                                setName(item.name);
                                                setQuantity(item.quantity || '');
                                                setImage(item.imageUrl || null);
                                                setNewImageUri(null);
                                            }
                                            setIsEditing(false);
                                        }}
                                        disabled={uploading}
                                    >
                                        <Text style={styles.cancelEditButtonText}>Cancel</Text>
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
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity 
                                        style={[styles.button, styles.deleteButton]} 
                                        onPress={() => {
                                            onDelete(item.id);
                                            onClose();
                                        }}
                                    >
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.button, styles.editButton]}
                                        onPress={() => setIsEditing(true)}
                                    >
                                        <Text style={styles.editButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </ScrollView>
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modal: {
        backgroundColor: '#FFF7EE',
        borderRadius: 32,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
        maxWidth: 500,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 15,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(107, 75, 62, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#6B4B3E',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 22,
        fontFamily: 'Poppins-SemiBold',
        color: '#3D2E25',
        marginBottom: 24,
        textAlign: 'center',
        marginTop: 8,
    },
    largeImageContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E3D2C3',
        marginBottom: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    largeImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: '#A89B8F',
        fontSize: 20,
        fontWeight: 'bold',
    },
    imagePlaceholderSubtext: {
        color: '#A89B8F',
        fontSize: 14,
        marginTop: 4,
    },
    editBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(61, 46, 37, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    editBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    label: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: '#6B4B3E',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#3D2E25',
        borderWidth: 2,
        borderColor: '#E3D2C3',
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        backgroundColor: '#FFE5E5',
        borderWidth: 1,
        borderColor: '#FFC1C1',
    },
    deleteButtonText: {
        color: '#D32F2F',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    saveButton: {
        backgroundColor: '#6B4B3E',
        flex: 2,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    editButton: {
        backgroundColor: '#6B4B3E',
        flex: 2,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    cancelEditButton: {
        backgroundColor: '#E3D2C3',
        flex: 1,
    },
    cancelEditButtonText: {
        color: '#3D2E25',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    readOnlyInput: {
        backgroundColor: 'rgba(227, 210, 195, 0.2)',
        borderColor: 'transparent',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
