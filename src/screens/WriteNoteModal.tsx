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
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#6B4B3E',
    },
    title: {
        fontSize: 22,
        fontFamily: 'Poppins-SemiBold',
        color: '#3D2E25',
        marginBottom: 16,
        textAlign: 'center',
    },
    textArea: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#3D2E25',
        borderWidth: 2,
        borderColor: '#E3D2C3',
        minHeight: 150,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
    },
    button: {
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 8,
        minWidth: 0,
    },
    saveButton: {
        backgroundColor: '#6B4B3E',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
    },
    cancelButtonText: {
        color: '#8B7361',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
});
