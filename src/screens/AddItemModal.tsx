import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase.config';

interface AddItemModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (name: string, quantity?: string, imageUrl?: string, imagePath?: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ visible, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        setUploading(true);
        try {
            let imageUrl = undefined;
            let imagePath = undefined;

            if (image) {
                const response = await fetch(image);
                const blob = await response.blob();
                const filename = `grocery-items/${Date.now()}-${name.trim()}.jpg`;
                const storageRef = ref(storage, filename);
                
                await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(storageRef);
                imagePath = filename;
            }

            onAdd(name.trim(), quantity.trim() || undefined, imageUrl, imagePath);

            // Reset fields
            setName('');
            setQuantity('');
            setImage(null);
            onClose();
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setName('');
        setQuantity('');
        setImage(null);
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
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Milk"
                        placeholderTextColor="#A89B8F"
                        value={name}
                        onChangeText={setName}
                        autoFocus
                    />

                    <Text style={styles.label}>Quantity (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 2L"
                        placeholderTextColor="#A89B8F"
                        value={quantity}
                        onChangeText={setQuantity}
                    />

                    <Text style={styles.label}>Image (optional)</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3D2E25',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B4B3E',
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#3D2E25',
        borderWidth: 2,
        borderColor: '#E3D2C3',
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
        fontWeight: '600',
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
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
