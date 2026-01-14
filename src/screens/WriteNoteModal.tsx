import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

interface WriteNoteModalProps {
    visible: boolean;
    currentNote: string;
    onClose: () => void;
    onSave: (text: string) => void;
}

export const WriteNoteModal: React.FC<WriteNoteModalProps> = ({ visible, currentNote, onClose, onSave }) => {
    const [text, setText] = useState('');

    useEffect(() => {
        if (visible) {
            setText(currentNote);
        }
    }, [visible, currentNote]);

    const handleSave = () => {
        onSave(text);
        onClose();
    };

    const handleCancel = () => {
        setText(currentNote);
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
                    <Text style={styles.title}>Shared Note</Text>

                    <TextInput
                        style={styles.textArea}
                        placeholder="Write a note for your partner..."
                        placeholderTextColor="#A89B8F"
                        value={text}
                        onChangeText={setText}
                        multiline
                        numberOfLines={8}
                        textAlignVertical="top"
                        autoFocus
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
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
        marginBottom: 16,
        textAlign: 'center',
    },
    textArea: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#3D2E25',
        borderWidth: 2,
        borderColor: '#E3D2C3',
        minHeight: 150,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 20,
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
