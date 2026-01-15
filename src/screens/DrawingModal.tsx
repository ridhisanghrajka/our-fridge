import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { DrawingCanvas } from '../components/DrawingCanvas';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DrawingModalProps {
    visible: boolean;
    initialText: string;
    initialDrawing: string; // JSON string of paths
    onSave: (text: string, drawing: string) => void;
    onClose: () => void;
    rScale?: number;
}

export const DrawingModal: React.FC<DrawingModalProps> = ({
    visible,
    initialText,
    initialDrawing,
    onSave,
    onClose,
    rScale = 1
}) => {
    const [text, setText] = useState(initialText);
    const [paths, setPaths] = useState<string[]>([]);
    const [isDrawingMode, setIsDrawingMode] = useState(true);

    useEffect(() => {
        if (visible) {
            setText(initialText);
            try {
                if (initialDrawing) {
                    setPaths(JSON.parse(initialDrawing));
                } else {
                    setPaths([]);
                }
            } catch (e) {
                console.error("Failed to parse drawing paths", e);
                setPaths([]);
            }
        }
    }, [visible, initialText, initialDrawing]);

    const handleSave = () => {
        onSave(text, JSON.stringify(paths));
        onClose();
    };

    const handleClear = () => {
        setPaths([]);
    };

    const handleUndo = () => {
        setPaths((prev) => prev.slice(0, -1));
    };

    // Modal dimensions - roughly 80% screen width, 60% screen height
    const modalWidth = screenWidth * 0.9;
    const modalHeight = screenHeight * 0.7;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <BlurView intensity={30} style={styles.blurContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.modalContent, { width: modalWidth, height: modalHeight, borderRadius: 24 * rScale }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { fontSize: 20 * rScale }]}>Written Note</Text>
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    onPress={() => setIsDrawingMode(true)}
                                    style={[styles.tab, isDrawingMode && styles.activeTab]}
                                >
                                    <Text style={[styles.tabText, isDrawingMode && styles.activeTabText]}>Draw</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setIsDrawingMode(false)}
                                    style={[styles.tab, !isDrawingMode && styles.activeTab]}
                                >
                                    <Text style={[styles.tabText, !isDrawingMode && styles.activeTabText]}>Type</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Content Area */}
                        <View style={styles.contentArea}>
                            {isDrawingMode ? (
                                <View style={styles.canvasWrapper}>
                                    <DrawingCanvas
                                        width={modalWidth - 40}
                                        height={modalHeight - 180}
                                        initialPaths={paths}
                                        onDrawingUpdate={setPaths}
                                        scale={rScale}
                                    />
                                    <View style={styles.canvasControls}>
                                        <TouchableOpacity onPress={handleUndo} style={styles.controlButton}>
                                            <Text style={styles.controlText}>Undo</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleClear} style={styles.controlButton}>
                                            <Text style={styles.controlText}>Clear</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TextInput
                                    style={[styles.textInput, { fontSize: 18 * rScale }]}
                                    multiline
                                    placeholder="Tap to write a note..."
                                    placeholderTextColor="#A99E96"
                                    value={text}
                                    onChangeText={setText}
                                    autoFocus={!isDrawingMode}
                                />
                            )}
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSave} style={[styles.button, styles.saveButton]}>
                                <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 247, 238, 0.4)',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF7EE',
        borderWidth: 6,
        borderColor: '#6B4B3E',
        padding: 20,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        fontWeight: '700',
        color: '#6B4B3E',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3E3D7',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#6B4B3E',
    },
    tabText: {
        color: '#6B4B3E',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFF7EE',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#E7D5C9',
        overflow: 'hidden',
    },
    canvasWrapper: {
        flex: 1,
    },
    canvasControls: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 10,
        right: 10,
        gap: 10,
    },
    controlButton: {
        backgroundColor: 'rgba(107, 75, 62, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    controlText: {
        color: '#6B4B3E',
        fontSize: 12,
        fontWeight: '600',
    },
    textInput: {
        flex: 1,
        padding: 15,
        color: '#6B4B3E',
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#6B4B3E',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    saveButton: {
        backgroundColor: '#6B4B3E',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B4B3E',
    },
    saveButtonText: {
        color: '#FFF7EE',
    },
});
