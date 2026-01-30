import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView, Platform, Alert, NativeModules, BackHandler } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';

const CloseIcon = ({ size = 24, color = "#6B4B3E" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    </Svg>
);

interface WidgetInstructionsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const WidgetInstructionsModal: React.FC<WidgetInstructionsModalProps> = ({ visible, onClose }) => {
    const handleInstallWidget = () => {
        Alert.alert(
            "'Our Fridge' will close",
            "Closing the app is required to install the Lock Screen widget.",
            [
                {
                    text: "Open",
                    onPress: () => {
                        console.log('Attempting to close app. WidgetBridge status:', !!NativeModules.WidgetBridge, 'exitApp status:', !!NativeModules.WidgetBridge?.exitApp);
                        if (Platform.OS === 'ios') {
                            if (NativeModules.WidgetBridge?.exitApp) {
                                NativeModules.WidgetBridge.exitApp();
                            } else {
                                console.warn('WidgetBridge.exitApp not found. Did you rebuild the native app?');
                                onClose();
                            }
                        } else {
                            BackHandler.exitApp();
                        }
                    },
                    style: "default"
                }
            ]
        );
    };

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Home screen widgets</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                            <CloseIcon />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        contentContainerStyle={styles.scrollContent} 
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.animationWrapper}>
                            <View style={styles.animationContainer}>
                                <LottieView
                                    source={require('../assets/animations/widget_instruction.json')}
                                    autoPlay
                                    loop
                                    style={styles.lottieAnimation}
                                />
                            </View>
                        </View>

                        <Text style={styles.instructionTitle}>Add a widget to your phone's Lock Screen</Text>

                        <View style={styles.stepsContainer}>
                            <Step number={1} text="Long-press your Lock Screen, then tap “Customize”" />
                            <Step number={2} text="Tap the widget area and add it" />
                            <Step number={3} text="Tap the widget to customize content, font, and refresh rate" />
                        </View>

                        <TouchableOpacity 
                            style={styles.installButton} 
                            onPress={handleInstallWidget}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.installButtonText}>Install widget</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const Step = ({ number, text }: { number: number; text: string }) => (
    <View style={styles.stepRow}>
        <Text style={styles.stepText}>{number}. {text}</Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#F2E8DF' 
    },
    container: { 
        flex: 1 
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 16,
        paddingHorizontal: 20,
        position: 'relative'
    },
    headerTitle: { 
        fontSize: 20, 
        fontFamily: 'Poppins-Bold', 
        color: '#6B4B3E' 
    },
    closeButton: { 
        position: 'absolute', 
        right: 20, 
        padding: 8,
        backgroundColor: '#FFF7EE',
        borderRadius: 20,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollContent: { 
        padding: 24,
        paddingTop: 6,
        alignItems: 'center',
        paddingBottom: 40,
    },
    animationWrapper: {
        width: '100%',
        aspectRatio: 1,
        marginBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    animationContainer: { 
        width: '100%', 
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    lottieAnimation: {
        width: '100%',
        height: '100%',
    },
    instructionTitle: { 
        fontSize: 28, 
        fontFamily: 'Poppins-Bold', 
        textAlign: 'center', 
        color: '#3D2E25', 
        marginBottom: 32,
        lineHeight: 36
    },
    stepsContainer: { 
        width: '100%', 
        marginBottom: 20 
    },
    stepRow: { 
        flexDirection: 'row', 
        marginBottom: 20, 
        alignItems: 'flex-start' 
    },
    stepText: { 
        flex: 1, 
        fontSize: 18, 
        fontFamily: 'Inter-Medium', 
        color: '#6B4B3E', 
        lineHeight: 20,
        paddingLeft: 10,
        paddingRight: 10,
    },
    installButton: { 
        backgroundColor: '#3E2723', 
        paddingVertical: 20, 
        borderRadius: 35, 
        width: '100%', 
        alignItems: 'center',
        shadowColor: '#3E2723',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    installButtonText: { 
        color: '#FFF', 
        fontSize: 18, 
        fontFamily: 'Inter-Bold' 
    }
});
