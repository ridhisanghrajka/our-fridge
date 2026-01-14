import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

interface AddItemModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (name: string, emoji?: string, quantity?: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ visible, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('');
    const [quantity, setQuantity] = useState('');

    const handleSave = () => {
        if (!name.trim()) return;

        onAdd(name.trim(), emoji.trim() || undefined, quantity.trim() || undefined);

        // Reset fields
        setName('');
        setEmoji('');
        setQuantity('');
        onClose();
    };

    const handleCancel = () => {
        setName('');
        setEmoji('');
        setQuantity('');
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

                    <Text style={styles.label}>Emoji (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 🥛"
                        placeholderTextColor="#A89B8F"
                        value={emoji}
                        onChangeText={setEmoji}
                        maxLength={2}
                    />

                    <Text style={styles.label}>Quantity (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 2L"
                        placeholderTextColor="#A89B8F"
                        value={quantity}
                        onChangeText={setQuantity}
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.saveButton, !name.trim() && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={!name.trim()}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
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
