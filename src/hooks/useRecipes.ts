import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Recipe, RecipeIngredient } from '../types/Recipe';
import { User } from '../types/User';

export const useRecipes = (pairId: string | null, user: User | null) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!pairId) {
            setRecipes([]);
            setLoading(false);
            return;
        }

        const recipesRef = collection(db, 'recipes');
        const q = query(
            recipesRef,
            where('pairId', '==', pairId)
        );

        const unsubscribe = onSnapshot(
            q, 
            (snapshot) => {
                const fetchedRecipes: Recipe[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedRecipes.push({
                        id: doc.id,
                        pairId: data.pairId,
                        name: data.name,
                        ingredients: data.ingredients || [],
                        notes: data.notes,
                        imageUrl: data.imageUrl,
                        imagePath: data.imagePath,
                        createdBy: data.createdBy,
                        createdByName: data.createdByName,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                    });
                });

                // Sort by creation date in memory (newest first)
                const sorted = fetchedRecipes.sort((a, b) => 
                    b.createdAt.getTime() - a.createdAt.getTime()
                );

                setRecipes(sorted);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching recipes:', error);
                setRecipes([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [pairId]);

    const addRecipe = async (
        name: string, 
        ingredients: Omit<RecipeIngredient, 'id' | 'addedToList'>[],
        notes?: string,
        imageUrl?: string,
        imagePath?: string
    ) => {
        if (!pairId || !user) return;

        const recipeData = {
            pairId,
            name: name.trim(),
            ingredients: ingredients.map((ing, index) => {
                const sanitizedIng: any = {
                    id: `${Date.now()}-${index}`,
                    addedToList: false,
                };
                Object.keys(ing).forEach(key => {
                    if ((ing as any)[key] !== undefined) {
                        sanitizedIng[key] = (ing as any)[key];
                    }
                });
                return sanitizedIng;
            }),
            notes: notes || '',
            imageUrl: imageUrl || '',
            imagePath: imagePath || '',
            createdBy: user.uid,
            createdByName: user.name || 'User',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, 'recipes'), recipeData);
    };

    const updateRecipe = async (recipeId: string, updates: Partial<Recipe>) => {
        const recipeRef = doc(db, 'recipes', recipeId);
        
        // Remove undefined values and sanitize ingredients
        const sanitizedUpdates: any = {};
        const protectedFields = ['id', 'createdAt', 'pairId', 'createdBy', 'createdByName'];
        
        Object.keys(updates).forEach(key => {
            if (protectedFields.includes(key)) return;
            
            const value = (updates as any)[key];
            if (value !== undefined) {
                if (key === 'ingredients' && Array.isArray(value)) {
                    sanitizedUpdates[key] = value.map(ing => {
                        const sanitizedIng: any = {};
                        Object.keys(ing).forEach(ingKey => {
                            if (ing[ingKey] !== undefined) {
                                sanitizedIng[ingKey] = ing[ingKey];
                            }
                        });
                        return sanitizedIng;
                    });
                } else {
                    sanitizedUpdates[key] = value;
                }
            }
        });

        const firestoreUpdates: any = {
            ...sanitizedUpdates,
            updatedAt: Timestamp.now(),
        };
        await updateDoc(recipeRef, firestoreUpdates);
    };

    const deleteRecipe = async (recipeId: string) => {
        const recipeRef = doc(db, 'recipes', recipeId);
        await deleteDoc(recipeRef);
    };

    const markIngredientAdded = async (recipeId: string, ingredientId: string) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        const updatedIngredients = recipe.ingredients.map(ing =>
            ing.id === ingredientId ? { ...ing, addedToList: true } : ing
        );

        await updateRecipe(recipeId, { ingredients: updatedIngredients });
    };

    const markIngredientRemoved = async (recipeId: string, ingredientId: string) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        const updatedIngredients = recipe.ingredients.map(ing =>
            ing.id === ingredientId ? { ...ing, addedToList: false } : ing
        );

        await updateRecipe(recipeId, { ingredients: updatedIngredients });
    };

    return {
        recipes,
        loading,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        markIngredientAdded,
        markIngredientRemoved,
    };
};
