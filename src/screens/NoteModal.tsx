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
import { NoteCanvas } from '../components/NoteCanvas';
import { CanvasElement } from '../types/SharedNote';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface NoteModalProps {
    visible: boolean;
    initialContent: string; // JSON string of CanvasElement[]
    onSave: (content: string) => void;
    onClose: () => void;
    rScale?: number;
}

type Tool = 'pen' | 'text' | 'eraser' | 'magnet';

export const NoteModal: React.FC<NoteModalProps> = ({
    visible,
    initialContent,
    onSave,
    onClose,
    rScale = 1
}) => {
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [currentTool, setCurrentTool] = useState<Tool>('pen');

    useEffect(() => {
        if (visible) {
            try {
                if (initialContent) {
                    setElements(JSON.parse(initialContent));
                } else {
                    setElements([]);
                }
            } catch (e) {
                console.error("Failed to parse canvas elements", e);
                setElements([]);
            }
        }
    }, [visible, initialContent]);

    const handleSave = () => {
        onSave(JSON.stringify(elements));
        onClose();
    };

    const handleClearAll = () => {
        setElements([]);
    };

    const handleUndo = () => {
        setElements((prev) => prev.slice(0, -1));
    };

    const modalWidth = screenWidth * 0.94;
    const modalHeight = screenHeight * 0.75;

    const tools: { id: Tool; label: string; icon: string }[] = [
        { id: 'pen', label: 'Pen', icon: '✏️' },
        { id: 'text', label: 'Text', icon: 'T' },
        { id: 'magnet', label: 'Magnet', icon: '🧲' },
        { id: 'eraser', label: 'Eraser', icon: '🧹' },
    ];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <BlurView intensity={40} style={styles.blurContainer}>
                <View style={[styles.modalContent, { width: modalWidth, height: modalHeight, borderRadius: 24 * rScale }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { fontSize: 22 * rScale }]}>Fridge Note</Text>
                        <View style={styles.topActions}>
                            <TouchableOpacity onPress={handleUndo} style={styles.actionIcon}>
                                <Text style={styles.actionIconText}>↩️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClearAll} style={styles.actionIcon}>
                                <Text style={styles.actionIconText}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Toolbar */}
                    <View style={styles.toolbar}>
                        {tools.map((tool) => (
                            <TouchableOpacity
                                key={tool.id}
                                onPress={() => setCurrentTool(tool.id)}
                                style={[
                                    styles.toolButton,
                                    currentTool === tool.id && styles.activeToolButton
                                ]}
                            >
                                <Text style={[styles.toolIcon, currentTool === tool.id && styles.activeToolIcon]}>
                                    {tool.icon}
                                </Text>
                                <Text style={[styles.toolLabel, currentTool === tool.id && styles.activeToolLabel]}>
                                    {tool.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Canvas Area */}
                    {(() => {
                        const canvasWidth = modalWidth - 40;
                        // Match aspect ratio of NotepadSVG notes area (700:480)
                        const canvasHeight = canvasWidth * (480 / 700);
                        return (
                            <View style={[styles.canvasContainer, { height: canvasHeight }]}>
                                <NoteCanvas
                                    width={canvasWidth}
                                    height={canvasHeight}
                                    elements={elements}
                                    currentTool={currentTool}
                                    onElementsChange={setElements}
                                />
                                {/* Tool Hint */}
                                <View style={styles.hintContainer} pointerEvents="none">
                                    <Text style={styles.hintText}>
                                        {currentTool === 'pen' && "Scribble on the paper"}
                                        {currentTool === 'text' && "Tap to type or move labels"}
                                        {currentTool === 'magnet' && "Tap to place or move stickers"}
                                        {currentTool === 'eraser' && "Tap items to erase them"}
                                    </Text>
                                </View>
                            </View>
                        );
                    })()}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} style={[styles.button, styles.saveButton]}>
                            <Text style={[styles.buttonText, styles.saveButtonText]}>Save to Fridge</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(107, 75, 62, 0.2)',
    },
    modalContent: {
        backgroundColor: '#FFF7EE',
        borderWidth: 6,
        borderColor: '#6B4B3E',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontWeight: '800',
        color: '#6B4B3E',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    topActions: {
        flexDirection: 'row',
        gap: 15,
    },
    actionIcon: {
        padding: 5,
    },
    actionIconText: {
        fontSize: 24,
    },
    toolbar: {
        flexDirection: 'row',
        backgroundColor: '#F3E3D7',
        borderRadius: 18,
        padding: 6,
        marginBottom: 15,
        justifyContent: 'space-around',
    },
    toolButton: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 14,
        minWidth: 70,
    },
    activeToolButton: {
        backgroundColor: '#6B4B3E',
    },
    toolIcon: {
        fontSize: 22,
        marginBottom: 2,
    },
    activeToolIcon: {
        color: '#FFF',
    },
    toolLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B4B3E',
    },
    activeToolLabel: {
        color: '#FFF7EE',
    },
    canvasContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#E7D5C9',
        overflow: 'hidden',
    },
    hintContainer: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 12,
        color: '#C9B2A3',
        fontWeight: '600',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 15,
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
        fontWeight: '800',
        color: '#6B4B3E',
    },
    saveButtonText: {
        color: '#FFF7EE',
    },
    textInputOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    textInputCard: {
        backgroundColor: '#FFF7EE',
        width: '100%',
        borderRadius: 20,
        padding: 20,
        borderWidth: 4,
        borderColor: '#6B4B3E',
    },
    inputTextTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6B4B3E',
        marginBottom: 15,
    },
    textInput: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        fontSize: 20,
        color: '#6B4B3E',
        borderWidth: 2,
        borderColor: '#E7D5C9',
        marginBottom: 20,
    },
    textInputActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
    inputAction: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    inputActionPrimary: {
        backgroundColor: '#6B4B3E',
        borderRadius: 10,
    },
    inputActionCancel: {
        color: '#6B4B3E',
        fontWeight: '700',
        fontSize: 16,
    },
    inputActionOk: {
        color: '#FFF7EE',
        fontWeight: '800',
        fontSize: 16,
    }
});
