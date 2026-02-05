import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform, 
    Alert,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import Svg, { Path } from 'react-native-svg';
import { usePairing } from '../hooks/usePairing';
import { useRecipes } from '../hooks/useRecipes';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

export const AddRecipeScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { pairId, user, isPremium } = usePairing();
    const { addRecipe } = useRecipes(pairId, user);

    const initialData = route.params?.initialData;

    const [recipeName, setRecipeName] = useState(initialData?.name || '');
    const [ingredients, setIngredients] = useState(
        initialData?.ingredients?.length > 0 
            ? initialData.ingredients.map((ing: { name?: string; quantity?: string }) => ({
                name: ing.name || '',
                quantity: ing.quantity || ''
            }))
            : [{ name: '', quantity: '' }]
    );
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [image, setImage] = useState<string | null>(initialData?.imageUrl || null);
    const [uploading, setUploading] = useState(false);

    // Remove the old import state and effect
    // const [importing, setImporting] = useState(false);
    // const [importUrl, setImportUrl] = useState('');
    // const [showImportInput, setShowImportInput] = useState(false);

    // Check if we should start in import mode - REMOVED
    /*
    React.useEffect(() => {
        const params = (navigation as any).getState()?.routes.find((r: any) => r.name === 'AddRecipe')?.params;
        if (params?.importMode) {
            setShowImportInput(true);
        }
    }, []);
    */

    // handleImportFromWeb - REMOVED (moved to ImportRecipeScreen)

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { name: '', quantity: '' }]);
    };

    const handleRemoveIngredient = (index: number) => {
        if (ingredients.length === 1) {
            setIngredients([{ name: '', quantity: '' }]);
            return;
        }
        setIngredients(ingredients.filter((_, i: number) => i !== index));
    };

    const handleUpdateIngredient = (index: number, field: 'name' | 'quantity', value: string) => {
        const updated = [...ingredients];
        updated[index] = { ...updated[index], [field]: value };
        setIngredients(updated);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleImagePress = () => {
        Alert.alert(
            'Add Photo',
            'Would you like to take a photo or choose from your library?',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Library', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSave = async () => {
        if (!isPremium) {
            Alert.alert(
                'Pro Feature', 
                'Adding recipes is a Pro feature. Upgrade to Our Fridge Pro to save your favorite meals!',
                [
                    { text: 'Not Now', style: 'cancel' },
                    { text: 'Go Pro', onPress: () => navigation.navigate('Profile' as never) }
                ]
            );
            return;
        }

        if (!recipeName.trim()) {
            Alert.alert('Missing Name', 'Please enter a recipe name');
            return;
        }

        const validIngredients = ingredients.filter(ing => ing.name.trim());
        if (validIngredients.length === 0) {
            Alert.alert('Missing Ingredients', 'Please add at least one ingredient');
            return;
        }

        setUploading(true);
        try {
            let imageUrl = undefined;
            let imagePath = undefined;

            if (image && !image.startsWith('http')) {
                const response = await fetch(image);
                const blob = await response.blob();
                imagePath = `recipes/${pairId}/${Date.now()}.jpg`;
                const storageRef = ref(storage, imagePath);
                await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(storageRef);
            } else if (image) {
                // If it's already a web URL, just use it
                imageUrl = image;
            }

            await addRecipe(recipeName, validIngredients, notes, imageUrl, imagePath);
            navigation.goBack();
        } catch (error) {
            console.error('Error adding recipe:', error);
            Alert.alert('Error', 'Failed to add recipe. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
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
                        <Text style={styles.headerTitle}>New Recipe</Text>
                        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={uploading}>
                            {uploading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Image Placeholder */}
                        <TouchableOpacity 
                            style={styles.imagePlaceholder} 
                            onPress={handleImagePress}
                            activeOpacity={0.8}
                        >
                            {image ? (
                                <Image source={{ uri: image }} style={styles.selectedImage} />
                            ) : (
                                <>
                                    <View style={styles.iconCircle}>
                                        <Svg width={40} height={40} viewBox="0 0 24 24">
                                            <Path fill="#6B4B3E" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                        </Svg>
                                    </View>
                                    <Text style={styles.imageText}>Add Photo</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Recipe Name */}
                        <View style={styles.inputSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recipe Name</Text>
                            </View>

                            <TextInput
                                style={styles.nameInput}
                                placeholder="What are we cooking?"
                                placeholderTextColor="#A89B8F"
                                value={recipeName}
                                onChangeText={setRecipeName}
                            />
                        </View>

                        {/* Notes */}
                        <View style={styles.inputSection}>
                            <Text style={styles.sectionTitle}>Notes</Text>
                            <View style={styles.notesContainer}>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder="Any special tips or memories..."
                                    placeholderTextColor="#A89B8F"
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Ingredients */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Ingredients</Text>
                            <TouchableOpacity onPress={handleAddIngredient} style={styles.addIngredientBtn}>
                                <Text style={styles.addIngredientBtnText}>+ Add</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.ingredientsList}>
                            {ingredients.map((ingredient: { name: string; quantity: string }, index: number) => (
                                <View key={index} style={styles.ingredientRow}>
                                    <TextInput
                                        style={styles.qtyInput}
                                        placeholder="Qty"
                                        placeholderTextColor="#A89B8F"
                                        value={ingredient.quantity}
                                        onChangeText={(text) => handleUpdateIngredient(index, 'quantity', text)}
                                    />
                                    <TextInput
                                        style={styles.ingNameInput}
                                        placeholder="Ingredient name"
                                        placeholderTextColor="#A89B8F"
                                        value={ingredient.name}
                                        onChangeText={(text) => handleUpdateIngredient(index, 'name', text)}
                                    />
                                    <TouchableOpacity 
                                        onPress={() => handleRemoveIngredient(index)}
                                        style={styles.removeBtn}
                                    >
                                        <Text style={styles.removeBtnText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFF6EA', // Matches the bottom of the gradient for seamless look
    },
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
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
    saveButton: {
        backgroundColor: '#6B4B3E',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    imagePlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: '#FFF9F2',
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#F3E5D8',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    selectedImage: {
        width: '100%',
        height: '100%',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF0E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    imageText: {
        fontFamily: 'Inter-Medium',
        color: '#8D776D',
        fontSize: 14,
    },
    inputSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#5D4037',
        marginBottom: 4,
    },
    subtext: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: '#A89B8F',
        marginTop: 4,
    },
    nameInput: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E5D8',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    addIngredientBtn: {
        backgroundColor: '#FFF0E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    addIngredientBtnText: {
        fontFamily: 'Inter-Bold',
        color: '#6B4B3E',
        fontSize: 12,
    },
    ingredientsList: {
        marginBottom: 24,
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
        paddingVertical: 1,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(243, 229, 216, 0.5)',
    },
    qtyInput: {
        width: 60,
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: '#8D776D',
        marginRight: 12,
    },
    ingNameInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
    },
    removeBtn: {
        padding: 8,
    },
    removeBtnText: {
        fontSize: 24,
        color: '#A89B8F',
        fontFamily: 'Inter-Light',
    },
    notesContainer: {
        backgroundColor: '#FFF9F2',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3E5D8',
        minHeight: 120,
    },
    notesInput: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
        lineHeight: 24,
    },
});
