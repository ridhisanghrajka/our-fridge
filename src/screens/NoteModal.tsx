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
import Svg, { Path, G } from 'react-native-svg';
import { NoteCanvas } from '../components/NoteCanvas';
import { MagnetPicker } from '../components/MagnetPicker';
import { CanvasElement } from '../types/SharedNote';
import { presentPaywall } from '../services/billing';

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
    const [selectedMagnetType, setSelectedMagnetType] = useState<string>('uk');

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

    const handleSave = async () => {
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

    const tools: { id: Tool; label: string; icon: (color: string) => React.ReactNode }[] = [
        { 
            id: 'pen', 
            label: 'Pen', 
            icon: (color) => (
                <Svg width="20" height="20" viewBox="0 0 16 16">
                    <Path fill={color} d="M12.6 0c.703 0 1.37.275 1.86.772l.751.751c.497.497.772 1.16.772 1.86c0 .703-.275 1.37-.771 1.86l-10.5 10.6a.5.5 0 0 1-.355.148H.487a.5.5 0 0 1-.5-.5v-3.75a.5.5 0 0 1 .146-.353l10.6-10.6a2.62 2.62 0 0 1 1.86-.772zM9.73 3.2L.99 11.96V15h3.16l8.65-8.73zM12.6 1c-.438 0-.847.17-1.16.479l-1.01 1.01l3.07 3.07l1.01-1.01c.271-.271.435-.618.472-.994l.008-.163c0-.437-.17-.847-.48-1.16l-.75-.751a1.62 1.62 0 0 0-1.16-.479z" stroke={color} strokeWidth="0.2"/>
                </Svg>
            )
        },
        { 
            id: 'text', 
            label: 'Text', 
            icon: (color) => (
                <Svg width="22" height="22" viewBox="0 0 24 24">
                    <Path fill={color} fillRule="evenodd" d="M6.814 7.105A1.25 1.25 0 0 1 8 6.25h.75a1.25 1.25 0 0 1 1.186.855l3 9a1.25 1.25 0 0 1-2.372.79l-.465-1.395H6.65l-.465 1.395a1.25 1.25 0 1 1-2.372-.79zM7.484 13h1.782l-.891-2.672zm8.89-1.25c-.607 0-1.374.621-1.374 1.75s.767 1.75 1.375 1.75s1.375-.621 1.375-1.75s-.767-1.75-1.375-1.75m1.693-2.082a3.6 3.6 0 0 0-1.692-.418c-2.292 0-3.875 2.065-3.875 4.25s1.583 4.25 3.875 4.25c.622 0 1.192-.152 1.692-.418a1.25 1.25 0 0 0 2.183-.832v-6a1.25 1.25 0 0 0-2.183-.832" clipRule="evenodd"/>
                </Svg>
            )
        },
        { 
            id: 'magnet', 
            label: 'Magnet', 
            icon: (color) => (
                <Svg width="22" height="22" viewBox="0 0 24 24">
                    <G fill="none" stroke={color} strokeWidth="1.8">
                        <Path d="M4 10c0-3.771 0-5.657 1.172-6.828S8.229 2 12 2s5.657 0 6.828 1.172S20 6.229 20 10v3c0 3.771 0 5.657-1.172 6.828S15.771 21 12 21s-5.657 0-6.828-1.172S4 16.771 4 13z"/>
                        <Path strokeLinejoin="round" d="M17 21v1h-1v-1m-8 0v1H7v-1"/>
                        <Path d="M20 11.5H4"/>
                        <Path strokeLinecap="round" d="M17 7v2m0 5v2"/>
                    </G>
                </Svg>
            )
        },
        { 
            id: 'eraser', 
            label: 'Eraser', 
            icon: (color) => (
                <Svg width="22" height="22" viewBox="0 0 24 24">
                    <Path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.788 20.5h9.02m-9.02 0a3.47 3.47 0 0 0 2.486-1.02l1.29-1.29M9.788 20.5a3.47 3.47 0 0 1-2.438-1.02l-3.33-3.33a3.48 3.48 0 0 1 0-4.923l1.29-1.29m0 0l5.417-5.417a3.48 3.48 0 0 1 4.923 0l3.33 3.33a3.48 3.48 0 0 1 0 4.924l-5.417 5.416M5.31 9.936l.367.368l7.585 7.585l.301.301"/>
                </Svg>
            )
        },
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
                                <Svg width="24" height="24" viewBox="0 0 24 24">
                                    <Path fill="#6B4B3E" d="M8 19q-.425 0-.712-.288T7 18t.288-.712T8 17h6.1q1.575 0 2.738-1T18 13.5T16.838 11T14.1 10H7.8l1.9 1.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275L4.7 9.7q-.15-.15-.213-.325T4.426 9t.063-.375T4.7 8.3l3.6-3.6q.275-.275.7-.275t.7.275t.275.7t-.275.7L7.8 8h6.3q2.425 0 4.163 1.575T20 13.5t-1.737 3.925T14.1 19z"/>
                                </Svg>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClearAll} style={styles.actionIcon}>
                                <Svg width="24" height="24" viewBox="0 0 24 24">
                                    <Path fill="none" stroke="#6B4B3E" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M19 8v11.6a2.4 2.4 0 0 1-2.4 2.4H7.4A2.4 2.4 0 0 1 5 19.6V8m11-3V3.2c0-.66-.54-1.2-1.2-1.2H9.2C8.54 2 8 2.54 8 3.2V5m8 0H8m8 0h5M8 5H3m9 6v6m3-6v6m-6-6v6"/>
                                </Svg>
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
                                <View style={styles.toolIcon}>
                                    {tool.icon(currentTool === tool.id ? '#FFF7EE' : '#6B4B3E')}
                                </View>
                                <Text style={[styles.toolLabel, currentTool === tool.id && styles.activeToolLabel]}>
                                    {tool.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Magnet Picker */}
                    <MagnetPicker
                        visible={currentTool === 'magnet'}
                        selectedMagnetType={selectedMagnetType}
                        onSelectMagnet={setSelectedMagnetType}
                    />

                    {/* Canvas Area */}
                    {(() => {
                        const canvasWidth = modalWidth - 40;
                        // Match aspect ratio of NotepadSVG notes area (800:480)
                        const canvasHeight = canvasWidth * (480 / 800);
                        return (
                            <>
                                {/* Tool Hint */}
                                <View style={styles.hintContainer} pointerEvents="none">
                                    <Text style={styles.hintText}>
                                        {currentTool === 'pen' && "Scribble on the paper"}
                                        {currentTool === 'text' && "Tap to type or move labels"}
                                        {currentTool === 'magnet' && "Tap to place or move stickers"}
                                        {currentTool === 'eraser' && "Tap items to erase them"}
                                    </Text>
                                </View>
                                <View style={[styles.canvasContainer, { height: canvasHeight }]}>
                                    <NoteCanvas
                                        width={canvasWidth}
                                        height={canvasHeight}
                                        elements={elements}
                                        currentTool={currentTool}
                                        onElementsChange={setElements}
                                        selectedMagnetType={selectedMagnetType}
                                    />
                                </View>
                            </>
                        );
                    })()}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
                            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
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
        borderWidth: 1,
        borderColor: '#6B4B3E',
        padding: 20,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
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
        fontSize: 22,
        fontFamily: 'Poppins-SemiBold',
        color: '#6B4B3E',
    },
    topActions: {
        flexDirection: 'row',
        gap: 15,
    },
    actionIcon: {
        padding: 5,
        backgroundColor: 'rgba(107, 75, 62, 0.1)',
        borderRadius: 8,
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
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    toolLabel: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
        color: '#6B4B3E',
    },
    activeToolLabel: {
        color: '#FFF7EE',
    },
    canvasContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E7D5C9',
        overflow: 'hidden',
    },
    hintContainer: {
        marginBottom: 8,
        alignItems: 'center',
    },
    hintText: {
        fontSize: 13,
        color: '#6B4B3E',
        opacity: 0.7,
        fontFamily: 'Inter-Medium',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 25,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 14,
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
    buttonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#6B4B3E',
    },
    cancelButtonText: {
        color: '#8B7361',
        fontFamily: 'Inter-SemiBold',
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
        borderWidth: 1,
        borderColor: '#6B4B3E',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10,
    },
    inputTextTitle: {
        fontSize: 18,
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        marginBottom: 15,
    },
    textInput: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        fontSize: 20,
        fontFamily: 'Inter-Bold',
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
        fontFamily: 'Inter-Bold',
        fontSize: 16,
    },
    inputActionOk: {
        color: '#FFF7EE',
        fontFamily: 'Inter-ExtraBold',
        fontSize: 16,
    }
});