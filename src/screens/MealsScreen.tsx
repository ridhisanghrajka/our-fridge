import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { usePairing } from '../hooks/usePairing';
import { useRecipes } from '../hooks/useRecipes';
import Svg, { Path } from 'react-native-svg';
import { RecipeDetailScreen } from './RecipeDetailScreen';
import { Recipe } from '../types/Recipe';
import { presentPaywall } from '../services/billing';

import { useNavigation } from '@react-navigation/native';

export const MealsScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const { pairId, user, isPremium } = usePairing();
    const { recipes, loading } = useRecipes(pairId, user);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    const handleAddPress = () => {
        setMenuVisible(!menuVisible);
    };

    const handleOptionSelect = async (option: 'create' | 'import') => {
        setMenuVisible(false);
        if (!isPremium) {
            await presentPaywall(user?.uid);
            return;
        }

        if (option === 'create') {
            navigation.navigate('AddRecipe');
        } else {
            navigation.navigate('ImportRecipe');
        }
    };

    const handleRecipePress = async (recipe: Recipe) => {
        setSelectedRecipe(recipe);
    };

    const handleEditRecipe = (recipe: Recipe) => {
        // Placeholder for edit functionality
        Alert.alert('Edit Recipe', 'Editing recipes will be available soon!');
    };

    if (loading) {
        return (
            <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#6B4B3E" />
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#DDF3FF', '#FFF6EA']} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meals</Text>
            </View>

            <FlatList
                data={recipes}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Image 
                            source={require('../../assets/recipe_icon.png')} 
                            style={styles.emptyImage} 
                            contentFit="contain"
                            priority="high"
                        />
                        <Text style={styles.emptyText}>No recipes yet!</Text>
                        <Text style={styles.emptySubtext}>Add ingredients to your grocery list with a recipe!</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.recipeCard} 
                        onPress={() => handleRecipePress(item)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.scallopContainer}>
                            <Svg height="16" width="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
                                <Path 
                                    d="M0 0 H100 V5 Q 97.5 10, 95 5 T 90 5 T 85 5 T 80 5 T 75 5 T 70 5 T 65 5 T 60 5 T 55 5 T 50 5 T 45 5 T 40 5 T 35 5 T 30 5 T 25 5 T 20 5 T 15 5 T 10 5 T 5 5 T 0 5 Z" 
                                    fill="#FFFFFF" 
                                    opacity="1"
                                />
                            </Svg>
                        </View>
                        
                        <View style={styles.cardMainContent}>
                            <View style={styles.cardIconContainer}>
                                {item.imageUrl ? (
                                    <Image 
                                        source={{ uri: item.imageUrl }} 
                                        style={styles.recipeImage}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <Svg width={24} height={24} viewBox="0 0 24 24">
                                        <Path fill="#6B4B3E" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                    </Svg>
                                )}
                            </View>
                            <View style={styles.cardTextContainer}>
                                <Text style={styles.recipeName} numberOfLines={2}>{item.name}</Text>
                                <View style={styles.metadataContainer}>
                                    <Text style={styles.ingredientText}>{item.ingredients.length} items</Text>
                                    <Text style={styles.addedByText} numberOfLines={1}>
                                        by <Text style={styles.authorName}>{item.createdByName?.split(' ')[0] || 'Unknown'}</Text>
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {/* FAB Menu */}
            <View style={styles.fabContainer}>
                {menuVisible && (
                    <View style={styles.menuOptions}>
                        <TouchableOpacity 
                            style={styles.menuItem} 
                            onPress={() => handleOptionSelect('import')}
                        >
                            <Text style={styles.menuItemText}>Import Web Recipe</Text>
                            <View style={[styles.menuIconCircle, { backgroundColor: '#E0F2F1' }]}>
                                <Svg width={20} height={20} viewBox="0 0 24 24">
                                    <Path fill="#00796B" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93c0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41c0 2.08-.8 3.97-2.1 5.39z" />
                                </Svg>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.menuItem} 
                            onPress={() => handleOptionSelect('create')}
                        >
                            <Text style={styles.menuItemText}>Create Recipe</Text>
                            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF0E0' }]}>
                                <Svg width={20} height={20} viewBox="0 0 24 24">
                                    <Path fill="#6B4B3E" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83l3.75 3.75l1.83-1.83z" />
                                </Svg>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
                <TouchableOpacity 
                    style={[styles.fab, menuVisible && styles.fabActive]} 
                    onPress={handleAddPress}
                    activeOpacity={0.9}
                >
                    <Svg width={32} height={32} viewBox="0 0 24 24" style={{ transform: [{ rotate: menuVisible ? '45deg' : '0deg' }] }}>
                        <Path fill="#FFFFFF" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {selectedRecipe && (
                <RecipeDetailScreen
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                    onEdit={handleEditRecipe}
                />
            )}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 120,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 34,
        fontFamily: 'Poppins-Bold',
        color: '#6B4B3E',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        alignItems: 'flex-end',
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6B4B3E',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    fabActive: {
        backgroundColor: '#5D4037',
    },
    menuOptions: {
        marginBottom: 16,
        alignItems: 'flex-end',
        gap: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingLeft: 16,
        paddingRight: 8,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#6B4B3E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    menuItemText: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#5D4037',
        marginRight: 12,
    },
    menuIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    recipeCard: {
        width: '48%',
        backgroundColor: '#FFF9F2',
        borderRadius: 24,
        padding: 0,
        borderWidth: 2,
        borderColor: '#F3E5D8',
        shadowColor: '#5D4037',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        overflow: 'hidden',
        minHeight: 140,
    },
    scallopContainer: {
        width: '100%',
        height: 12,
        backgroundColor: 'transparent',
    },
    cardMainContent: {
        paddingHorizontal: 12,
        paddingBottom: 16,
        paddingTop: 0,
    },
    cardIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF0E0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        overflow: 'hidden',
    },
    recipeImage: {
        width: '100%',
        height: '100%',
    },
    cardTextContainer: {
        width: '100%',
    },
    recipeName: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#5D4037',
        marginBottom: 4,
        lineHeight: 20,
    },
    metadataContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    ingredientText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#8D776D',
        marginBottom: 2,
    },
    addedByText: {
        fontSize: 11,
        fontFamily: 'Inter-Regular',
        color: '#A89B8F',
    },
    authorName: {
        fontFamily: 'Poppins-SemiBold',
        color: '#8D776D',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyImage: {
        width: 250,
        height: 250,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#6B4B3E',
        fontFamily: 'Inter-Medium',
        textAlign: 'center',
        opacity: 0.6,
        paddingHorizontal: 40,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#A89B8F',
        fontFamily: 'Inter-Regular',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
