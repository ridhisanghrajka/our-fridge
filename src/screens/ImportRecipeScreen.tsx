import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePairing } from '../hooks/usePairing';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useShareStore } from '../services/shareStore';

export const ImportRecipeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { isPremium } = usePairing();
    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);
    const pendingRecipeUrl = useShareStore((state) => state.pendingRecipeUrl);
    const clearPendingRecipeUrl = useShareStore((state) => state.clearPendingRecipeUrl);
    const hasAutoTriggered = useRef(false);

    useEffect(() => {
        if (pendingRecipeUrl && !hasAutoTriggered.current) {
            hasAutoTriggered.current = true;
            setImportUrl(pendingRecipeUrl);
            handleImportFromWeb(pendingRecipeUrl);
            clearPendingRecipeUrl();
        }
    }, [pendingRecipeUrl]);

    const handleImportFromWeb = async (urlOverride?: string) => {
        if (!isPremium) {
            Alert.alert(
                'Pro Feature', 
                'Importing recipes from the web is a Pro feature. Upgrade to Our Fridge Pro to unlock it!',
                [
                    { text: 'Not Now', style: 'cancel' },
                    { text: 'Go Pro', onPress: () => navigation.navigate('Profile' as never) }
                ]
            );
            return;
        }

        const urlToUse = urlOverride || importUrl;
        if (!urlToUse.trim()) {
            Alert.alert('Error', 'Please paste a recipe URL');
            return;
        }

        setImporting(true);
        try {
            const response = await fetch('https://us-central1-our-fridge-5b835.cloudfunctions.net/scrapeRecipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                },
                body: JSON.stringify({ url: urlToUse }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to import recipe');
            }

            const data = await response.json();
            
            // Helper to decode HTML entities and clean up strings
            const cleanString = (str: any) => {
                if (str === null || str === undefined) return '';
                const stringValue = String(str);
                return stringValue
                    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&nbsp;/g, ' ')
                    .trim();
            };

            // Navigate to AddRecipe with the pre-filled data
            navigation.replace('AddRecipe', { 
                initialData: {
                    name: cleanString(data.name),
                    ingredients: (data.ingredients || []).map((i: any) => {
                        if (typeof i === 'string') return cleanString(i);
                        return {
                            name: cleanString(i.name),
                            quantity: cleanString(i.quantity)
                        };
                    }),
                    imageUrl: data.imageUrl || null,
                    notes: '' // Clear notes for new import
                }
            });
        } catch (error: any) {
            console.error('Import error:', error);
            Alert.alert('Import Failed', error.message || 'Could not find recipe data on that page.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.content}
                    >
                    <View style={styles.header}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            style={styles.closeButton}
                        >
                            <Svg width={24} height={24} viewBox="0 0 24 24">
                                <Path fill="#6B4B3E" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </Svg>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Import Recipe</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.topSection}>
                        <Text style={styles.sectionTitle}>1. Paste Link</Text>
                        <View style={styles.importContainer}>
                            <TextInput
                                style={styles.importInput}
                                placeholder="https://example.com/recipe"
                                placeholderTextColor="#A89B8F"
                                value={importUrl}
                                onChangeText={setImportUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                            <TouchableOpacity 
                                style={styles.importSubmitBtn} 
                                onPress={() => handleImportFromWeb()}
                                disabled={importing}
                            >
                                {importing ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.importSubmitText}>Go</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.dividerContainer}>
                        <View style={styles.line} />
                        <View style={styles.orCircle}>
                            <Text style={styles.orText}>OR</Text>
                        </View>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.bottomSection}>
                        <Text style={styles.sectionTitle}>2. Use Share Extension</Text>
                        <Text style={styles.subtext}>Share any recipe link from your browser to Our Fridge</Text>
                        <View style={styles.animationContainer}>
                            <LottieView
                                source={require('../../assets/animations/Scene-1 (5).json')}
                                autoPlay
                                loop
                                style={styles.lottie}
                            />
                        </View>
                    </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#3D2E25',
    },
    closeButton: {
        padding: 8,
    },
    topSection: {
        marginTop: 20,
        marginBottom: 40,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#5D4037',
        marginBottom: 12,
    },
    importContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#F3E5D8',
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    importInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
        marginRight: 12,
    },
    importSubmitBtn: {
        backgroundColor: '#6B4B3E',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 60,
        alignItems: 'center',
    },
    importSubmitText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
        fontSize: 14,
    },
    bottomSection: {
        flex: 1.5,
        alignItems: 'center',
    },
    subtext: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#8D776D',
        textAlign: 'center',
        marginBottom: 24,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        width: '100%',
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#F3E5D8',
    },
    orCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#F3E5D8',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
    },
    orText: {
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        color: '#A89B8F',
    },
    animationContainer: {
        width: '120%',
        flex: 1,
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 40,
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
});
