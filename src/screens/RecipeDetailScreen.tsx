import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Dimensions, 
    Animated, 
    TouchableOpacity, 
    SafeAreaView,
    Alert,
    Easing,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Recipe, RecipeIngredient } from '../types/Recipe';
import { usePairing } from '../hooks/usePairing';
import { useRecipes } from '../hooks/useRecipes';
import { useGroceryItems } from '../hooks/useGroceryItems';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FlyingIconProps {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    onComplete: () => void;
}

const FlyingIcon: React.FC<FlyingIconProps> = ({ startX, startY, targetX, targetY, onComplete }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            // Arc effect: Y moves with a different easing than X to create a curve
            Animated.timing(translateY, {
                toValue: targetY - startY,
                duration: 1800,
                easing: Easing.bezier(0.4, 0, 0.2, 1), // Standard easing for Y
                useNativeDriver: true,
            }),
            Animated.timing(translateX, {
                toValue: targetX - startX,
                duration: 1800,
                easing: Easing.bezier(0.3, 0.1, 0.3, 1), // Custom easing for X to create arc
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 0.3,
                duration: 1800,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(1500),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => onComplete());
    }, []);

    return (
        <Animated.View 
            style={[
                styles.flyingIcon,
                {
                    position: 'absolute',
                    left: startX,
                    top: startY,
                    transform: [
                        { translateX },
                        { translateY },
                        { scale },
                    ],
                    opacity,
                },
            ]}
        >
            <View style={styles.flyingIconInner}>
                <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Path fill="#FFF7EE" d="M17 2H7c-1.1 0-2 .9-2 2v15a2 2 0 0 0 2 2v1h2v-1h6v1h2v-1c1.11 0 2-.89 2-2V4a2 2 0 0 0-2-2m-7 13H8v-5h2z" />
                </Svg>
            </View>
        </Animated.View>
    );
};

interface RecipeDetailScreenProps {
    recipe: Recipe;
    onClose: () => void;
    onEdit?: (recipe: Recipe) => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipe: initialRecipe, onClose }) => {
    const { pairId, user } = usePairing();
    const { deleteRecipe, updateRecipe, recipes } = useRecipes(pairId, user);
    const { addItem, items: groceryItems, deleteItem: deleteGroceryItem, bulkAddItems, bulkDeleteItems } = useGroceryItems(pairId, user);
    
    const [isEditing, setIsEditing] = useState(false);
    const [recipeName, setRecipeName] = useState(initialRecipe.name);
    const [ingredients, setIngredients] = useState(initialRecipe.ingredients);
    const [notes, setNotes] = useState(initialRecipe.notes || '');
    const [image, setImage] = useState<string | null>(initialRecipe.imageUrl || null);
    const [uploading, setUploading] = useState(false);
    const [activeAnimations, setActiveAnimations] = useState<{ id: string; x: number; y: number }[]>([]);
    const [isBulkAddingVisually, setIsBulkAddingVisually] = useState(false);
    const [isBulkOperating, setIsBulkOperating] = useState(false);
    
    const checkboxRefs = useRef<Map<string, any>>(new Map());

    // Sync local state with the latest recipe data from Firestore
    const currentRecipe = recipes.find(r => r.id === initialRecipe.id);
    
    useEffect(() => {
        if (currentRecipe && !isEditing) {
            setIngredients(currentRecipe.ingredients);
            setRecipeName(currentRecipe.name);
            setNotes(currentRecipe.notes || '');
            setImage(currentRecipe.imageUrl || null);
        }
    }, [currentRecipe, isEditing]);

    const slideAnim = useRef(new Animated.Value(screenWidth)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, []);

    const handleClose = () => {
        if (isEditing) {
            Alert.alert(
                "Discard Changes",
                "Are you sure you want to discard your edits?",
                [
                    { text: "Keep Editing", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: () => performClose() }
                ]
            );
        } else {
            performClose();
        }
    };

    const performClose = () => {
        Animated.timing(slideAnim, {
            toValue: screenWidth,
            duration: 250,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const handleEditToggle = () => {
        if (isEditing) {
            handleSave();
        } else {
            setIsEditing(true);
        }
    };

    const handleCancelEdit = () => {
        if (currentRecipe) {
            setRecipeName(currentRecipe.name);
            setIngredients(currentRecipe.ingredients);
            setNotes(currentRecipe.notes || '');
            setImage(currentRecipe.imageUrl || null);
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
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
            let imageUrl = currentRecipe?.imageUrl || initialRecipe.imageUrl;
            let imagePath = currentRecipe?.imagePath || initialRecipe.imagePath;

            if (image && image !== (currentRecipe?.imageUrl || initialRecipe.imageUrl)) {
                const response = await fetch(image);
                const blob = await response.blob();
                imagePath = `recipes/${pairId}/${Date.now()}.jpg`;
                const storageRef = ref(storage, imagePath);
                await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(storageRef);
            }

            await updateRecipe(initialRecipe.id, {
                name: recipeName.trim(),
                ingredients: validIngredients,
                notes: notes.trim(),
                imageUrl,
                imagePath
            });
            
            setIsEditing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error updating recipe:', error);
            Alert.alert('Error', 'Failed to update recipe. Please try again.');
        } finally {
            setUploading(false);
        }
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
        if (!isEditing) return;
        Alert.alert(
            'Change Photo',
            'Would you like to take a photo or choose from your library?',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Library', onPress: pickImage },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleAddIngredient = () => {
        setIngredients([{ id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: '', quantity: '', addedToList: false }, ...ingredients]);
    };

    const handleRemoveIngredient = (id: string) => {
        setIngredients(ingredients.filter(ing => ing.id !== id));
    };

    const handleUpdateIngredient = (id: string, field: 'name' | 'quantity', value: string) => {
        setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Recipe",
            "Are you sure you want to delete this recipe?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        await deleteRecipe(initialRecipe.id);
                        performClose();
                    } 
                }
            ]
        );
    };

    const triggerAnimation = (x: number, y: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setActiveAnimations(prev => [...prev, { id, x, y }]);
    };

    const removeAnimation = (id: string) => {
        setActiveAnimations(prev => prev.filter(anim => anim.id !== id));
    };

    const isIngredientInList = (ingredientName: string) => {
        return groceryItems.some(item => 
            item.recipeId === initialRecipe.id && 
            item.name.toLowerCase() === ingredientName.toLowerCase() &&
            !item.isDone
        );
    };

    const handleIngredientAction = async (ingredient: RecipeIngredient, event: any) => {
        if (isEditing) return;

        const isAdded = isIngredientInList(ingredient.name);

        if (isAdded) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Delete all grocery items for this recipe with this name (handles duplicates)
            const itemsToDelete = groceryItems.filter(item => 
                item.recipeId === initialRecipe.id && 
                item.name.toLowerCase() === ingredient.name.toLowerCase() &&
                !item.isDone
            );
            if (itemsToDelete.length > 0) {
                await Promise.all(itemsToDelete.map(item => deleteGroceryItem(item.id)));
            }
        } else {
            event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                triggerAnimation(pageX, pageY);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            });

            await addItem(ingredient.name, undefined, ingredient.quantity, ingredient.imageUrl, ingredient.imagePath, initialRecipe.id);
        }
    };

    const allAdded = isBulkAddingVisually || (ingredients.length > 0 && ingredients.every(ing => isIngredientInList(ing.name)));

    const handleBulkAction = async () => {
        if (isEditing || isBulkOperating) return;

        setIsBulkOperating(true);

        if (allAdded) {
            setIsBulkAddingVisually(false);
            const itemsToDelete = groceryItems.filter(item => item.recipeId === initialRecipe.id && !item.isDone);
            if (itemsToDelete.length > 0) {
                await bulkDeleteItems(itemsToDelete.map(item => item.id), initialRecipe.name);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setIsBulkOperating(false);
        } else {
            // Set visual state IMMEDIATELY on click for instant feedback
            setIsBulkAddingVisually(true);

            // Trigger animations for all items that are about to be added
            ingredients.forEach((ing, index) => {
                if (!isIngredientInList(ing.name)) {
                    const ref = checkboxRefs.current.get(ing.id);
                    if (ref) {
                        // Delay animations slightly so they don't all start exactly at the same time
                        setTimeout(() => {
                            ref.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                                triggerAnimation(pageX, pageY);
                            });
                        }, index * 50);
                    }
                }
            });

            // Trigger success haptic after animation completes
            setTimeout(() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 1800);

            const itemsToAdd = ingredients
                .filter(ing => !isIngredientInList(ing.name))
                .map(ing => ({
                    name: ing.name,
                    quantity: ing.quantity,
                    imageUrl: ing.imageUrl,
                    imagePath: ing.imagePath,
                    recipeId: initialRecipe.id
                }));

            if (itemsToAdd.length > 0) {
                await bulkAddItems(itemsToAdd, initialRecipe.name);
            }
            
            // Wait for Firestore to sync back before allowing another action
            setTimeout(() => {
                setIsBulkOperating(false);
            }, 1000);
        }
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
            <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.gradient}>
                <SafeAreaView style={styles.safeArea}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? -200 : 0}
                    >
                        {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={isEditing ? handleCancelEdit : handleClose} style={styles.headerButton}>
                            {isEditing ? (
                                <Text style={styles.cancelText}>Cancel</Text>
                            ) : (
                                <Svg width={24} height={24} viewBox="0 0 24 24">
                                    <Path fill="#6B4B3E" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                                </Svg>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isEditing ? 'Edit Recipe' : 'Recipe Details'}</Text>
                        <TouchableOpacity onPress={handleEditToggle} style={styles.headerButton} disabled={uploading}>
                            {uploading ? (
                                <ActivityIndicator size="small" color="#6B4B3E" />
                            ) : (
                                <Text style={styles.editText}>{isEditing ? 'Save' : 'Edit'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        style={styles.scrollView} 
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        automaticallyAdjustKeyboardInsets={true}
                    >
                        {/* Image Section */}
                        {(image || isEditing) && (
                            <TouchableOpacity 
                                style={[styles.imageContainer, isEditing && styles.imageContainerEditing]} 
                                onPress={handleImagePress}
                                activeOpacity={isEditing ? 0.8 : 1}
                            >
                                {image ? (
                                    <Image source={{ uri: image }} style={styles.recipeImage} contentFit="cover" />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <View style={styles.iconCircle}>
                                            <Svg width={40} height={40} viewBox="0 0 24 24">
                                                <Path fill="#6B4B3E" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                            </Svg>
                                        </View>
                                        <Text style={styles.imageText}>Add Photo</Text>
                                    </View>
                                )}
                                {isEditing && image && (
                                    <View style={styles.imageOverlay}>
                                        <Text style={styles.changePhotoText}>Change Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* Recipe Name */}
                        {isEditing ? (
                            <View style={styles.inputSection}>
                                <Text style={styles.sectionTitle}>Recipe Name</Text>
                                <TextInput
                                    style={styles.nameInput}
                                    value={recipeName}
                                    onChangeText={setRecipeName}
                                    placeholder="Recipe Name"
                                    placeholderTextColor="#A89B8F"
                                />
                            </View>
                        ) : (
                            <Text style={styles.recipeNameDisplay}>{recipeName}</Text>
                        )}
                        
                        {!isEditing && (
                            <View style={styles.metaContainer}>
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaText}>
                                        {ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                                    </Text>
                                    <Text style={styles.metaText}>by {initialRecipe.createdByName}</Text>
                                </View>
                                {notes ? (
                                    <Text style={styles.inlineNotes}>
                                        <Text style={styles.notesLabel}>Notes: </Text>{notes}
                                    </Text>
                                ) : null}
                            </View>
                        )}

                        {/* Notes Section (moved above ingredients in edit mode) */}
                        {isEditing && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Notes</Text>
                                <View style={styles.notesContainer}>
                                    <TextInput
                                        style={styles.notesInput}
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="Any special tips or memories..."
                                        placeholderTextColor="#A89B8F"
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Ingredients Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Ingredients</Text>
                                {isEditing && (
                                    <TouchableOpacity onPress={handleAddIngredient} style={styles.addIngredientBtn}>
                                        <Text style={styles.addIngredientBtnText}>+ Add</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            <View style={styles.ingredientsCard}>
                                {ingredients.map((ingredient, index) => (
                                    <View key={ingredient.id} style={[
                                        styles.ingredientRow,
                                        index === ingredients.length - 1 && { borderBottomWidth: 0 }
                                    ]}>
                                        {!isEditing && (
                                            <TouchableOpacity
                                                ref={(ref) => {
                                                    if (ref) checkboxRefs.current.set(ingredient.id, ref);
                                                    else checkboxRefs.current.delete(ingredient.id);
                                                }}
                                                style={[styles.checkbox, (isBulkAddingVisually || isIngredientInList(ingredient.name)) && styles.checkboxFilled]}
                                                onPress={(e) => handleIngredientAction(ingredient, e)}
                                            >
                                                {(isBulkAddingVisually || isIngredientInList(ingredient.name)) && (
                                                    <Svg width={16} height={16} viewBox="0 0 24 24">
                                                        <Path fill="#FFF7EE" d="M17 2H7c-1.1 0-2 .9-2 2v15a2 2 0 0 0 2 2v1h2v-1h6v1h2v-1c1.11 0 2-.89 2-2V4a2 2 0 0 0-2-2m-7 13H8v-5h2z" />
                                                    </Svg>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                        
                                        <View style={styles.ingredientInfo}>
                                            {isEditing ? (
                                                <View style={styles.ingredientEditRow}>
                                                    <TextInput
                                                        style={styles.qtyInput}
                                                        value={ingredient.quantity}
                                                        onChangeText={(text) => handleUpdateIngredient(ingredient.id, 'quantity', text)}
                                                        placeholder="Qty"
                                                        placeholderTextColor="#A89B8F"
                                                    />
                                                    <TextInput
                                                        style={styles.ingNameInput}
                                                        value={ingredient.name}
                                                        onChangeText={(text) => handleUpdateIngredient(ingredient.id, 'name', text)}
                                                        placeholder="Ingredient"
                                                        placeholderTextColor="#A89B8F"
                                                    />
                                                    <TouchableOpacity onPress={() => handleRemoveIngredient(ingredient.id)} style={styles.removeBtn}>
                                                        <Text style={styles.removeBtnText}>×</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <>
                                                    <Text style={[styles.ingredientName, (isBulkAddingVisually || isIngredientInList(ingredient.name)) && styles.ingredientNameAdded]}>
                                                        {ingredient.name}
                                                    </Text>
                                                    {ingredient.quantity && (
                                                        <Text style={[styles.ingredientQuantity, (isBulkAddingVisually || isIngredientInList(ingredient.name)) && styles.ingredientQuantityAdded]}>
                                                            {ingredient.quantity}
                                                        </Text>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Bulk Action Text */}
                            {!isEditing && ingredients.length > 0 && (
                                <TouchableOpacity 
                                    style={[styles.bulkActionButton, isBulkOperating && { opacity: 0.7 }]} 
                                    onPress={handleBulkAction}
                                    disabled={isBulkOperating}
                                    activeOpacity={0.7}
                                >
                                    {isBulkOperating ? (
                                        <ActivityIndicator size="small" color="#6B4B3E" />
                                    ) : (
                                        <Text style={[styles.bulkActionText, allAdded && styles.bulkActionTextRemove]}>
                                            {allAdded ? 'Remove all from list' : 'Add all ingredients to the list'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Notes Section (Only in editing mode) */}
                        {/* Delete Section (only in view mode) */}
                        {!isEditing && (
                            <View style={styles.deleteSection}>
                                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                                    <Text style={styles.deleteButtonText}>Delete Recipe</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </LinearGradient>

            {/* Multiple Flying Icons */}
            {activeAnimations.map(anim => (
                <FlyingIcon
                    key={anim.id}
                    startX={anim.x}
                    startY={anim.y}
                    targetX={70} // Center of Fridge icon in navigation
                    targetY={screenHeight - 60}
                    onComplete={() => removeAnimation(anim.id)}
                />
            ))}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 100,
        zIndex: 1000,
        backgroundColor: '#FFF6EA',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
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
    headerButton: {
        padding: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    editText: {
        color: '#6B4B3E',
        fontFamily: 'Inter-Bold',
        fontSize: 16,
    },
    cancelText: {
        color: '#A89B8F',
        fontFamily: 'Inter-Medium',
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 30,
        marginBottom: 24,
        overflow: 'hidden',
        backgroundColor: '#FFF9F2',
        borderWidth: 2,
        borderColor: '#F3E5D8',
    },
    imageContainerEditing: {
        borderStyle: 'dashed',
    },
    recipeImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF0E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    imageText: {
        fontFamily: 'Inter-Medium',
        color: '#8D776D',
        fontSize: 14,
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    changePhotoText: {
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
        fontSize: 14,
    },
    recipeNameDisplay: {
        fontSize: 28,
        fontFamily: 'Poppins-Bold',
        color: '#3D2E25',
        marginTop: 10,
    },
    inputSection: {
        marginTop: 10,
        marginBottom: 20,
    },
    nameInput: {
        fontSize: 18,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E5D8',
    },
    metaContainer: {
        marginTop: 8,
        marginBottom: 24,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    metaText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#A89B8F',
    },
    inlineNotes: {
        fontSize: 15,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
        lineHeight: 22,
        backgroundColor: 'rgba(243, 229, 216, 0.3)',
        padding: 12,
        borderRadius: 12,
    },
    notesLabel: {
        fontFamily: 'Inter-Bold',
        color: '#8D776D',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#5D4037',
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
    ingredientsCard: {
        backgroundColor: '#FFF9F2',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F3E5D8',
        overflow: 'hidden',
    },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3E5D8',
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(107, 75, 62, 0.3)',
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxFilled: {
        backgroundColor: '#6B4B3E',
        borderColor: '#6B4B3E',
    },
    ingredientInfo: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ingredientName: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: '#3D2E25',
        flex: 1,
    },
    ingredientNameAdded: {
        opacity: 0.5,
        textDecorationLine: 'line-through',
    },
    ingredientQuantity: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#8D776D',
        marginLeft: 12,
    },
    ingredientQuantityAdded: {
        opacity: 0.5,
    },
    ingredientEditRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    qtyInput: {
        width: 50,
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: '#8D776D',
        marginRight: 10,
    },
    ingNameInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#5D4037',
    },
    removeBtn: {
        padding: 0,
    },
    removeBtnText: {
        fontSize: 24,
        color: '#A89B8F',
        fontFamily: 'Inter-Light',
    },
    bulkActionButton: {
        marginTop: 16,
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    bulkActionText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#6B4B3E',
        textDecorationLine: 'underline',
    },
    bulkActionTextRemove: {
        color: '#A89B8F',
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
    deleteSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(107, 75, 62, 0.1)',
        alignItems: 'center',
    },
    deleteButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF5252',
    },
    deleteButtonText: {
        color: '#FF5252',
        fontFamily: 'Inter-Bold',
        fontSize: 14,
    },
    flyingIcon: {
        width: 32,
        height: 32,
        zIndex: 9999,
    },
    flyingIconInner: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#6B4B3E',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
