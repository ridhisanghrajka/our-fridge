import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, storage } from '../services/firebase';
import { GroceryItem } from '../types/GroceryItem';
import { User } from '../types/User';
import { upsertMemoryItem, deleteMemoryItem } from '../services/groceryMemory';
import { logActivity } from '../services/activity';
import { recordJoyMoment } from '../services/reviewService';

const CACHE_KEY_PREFIX = 'grocery_items_';

export const useGroceryItems = (pairId: string | null, user: User | null) => {
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const userName = user?.name || 'User';

    // Load from cache initially
    useEffect(() => {
        if (!pairId) return;

        const loadCache = async () => {
            try {
                const cachedData = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${pairId}`);
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    // Convert date strings back to Date objects
                    const itemsWithDates = parsed.map((item: any) => ({
                        ...item,
                        createdAt: new Date(item.createdAt),
                        updatedAt: new Date(item.updatedAt),
                    }));
                    setItems(itemsWithDates);
                    // We still keep loading true until Firebase responds
                }
            } catch (e) {
                console.error("Error loading grocery items cache:", e);
            }
        };

        loadCache();
    }, [pairId]);

    useEffect(() => {
        if (!pairId) {
            setItems([]);
            setLoading(false);
            return;
        }

        const itemsRef = collection(db, 'groceryItems');
        const q = query(
            itemsRef,
            where('pairId', '==', pairId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedItems: GroceryItem[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedItems.push({
                    id: doc.id,
                    pairId: data.pairId,
                    name: data.name,
                    emoji: data.emoji,
                    quantity: data.quantity,
                    imageUrl: data.imageUrl,
                    imagePath: data.imagePath,
                    recipeId: data.recipeId,
                    isDone: data.isDone,
                    createdBy: data.createdBy,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                });
            });

            // Sort: active items first, then bought items
            const sorted = fetchedItems.sort((a, b) => {
                if (a.isDone === b.isDone) {
                    return b.createdAt.getTime() - a.createdAt.getTime();
                }
                return a.isDone ? 1 : -1;
            });

            setItems(sorted);
            setLoading(false);

            // Update cache
            AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${pairId}`, JSON.stringify(sorted)).catch(e => {
                console.error("Error saving grocery items cache:", e);
            });
        });

        return () => unsubscribe();
    }, [pairId]);

    const addItem = async (name: string, emoji?: string, quantity?: string, imageUrl?: string, imagePath?: string, recipeId?: string) => {
        if (!pairId) return;

        const newItemData: any = {
            pairId,
            userId: user?.uid || '',
            name,
            emoji: emoji || '',
            quantity: quantity || '',
            imageUrl: imageUrl || '',
            imagePath: imagePath || '',
            recipeId: recipeId || null,
            isDone: false,
            createdBy: userName || 'User',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'groceryItems'), newItemData);

        // Log activity
        if (user) {
            logActivity(pairId, user.uid, userName, user.photoURL, 'ADD', name).catch(err =>
                console.error("Error logging add activity:", err)
            );
        }

        // Update implicit memory ONLY if it's not from a recipe (manual entry)
        if (!recipeId) {
            upsertMemoryItem(pairId, name, quantity, imageUrl, imagePath).catch(err => 
                console.error("Error updating memory:", err)
            );
        }

        // If the imageUrl is a local file, we need to upload it in the background
        if (imageUrl && imageUrl.startsWith('file://')) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const filename = `grocery-items/${Date.now()}-${name.trim()}.jpg`;
                const storageRef = ref(storage, filename);
                
                await uploadBytes(storageRef, blob);
                const downloadUrl = await getDownloadURL(storageRef);
                
                // Update the document with the real remote URL
                await updateDoc(docRef, {
                    imageUrl: downloadUrl,
                    imagePath: filename,
                    updatedAt: Timestamp.now(),
                });

                // Also update the memory with the permanent URL ONLY if it's not from a recipe
                if (!recipeId) {
                    upsertMemoryItem(pairId, name, quantity, downloadUrl, filename).catch(() => {});
                }
            } catch (error) {
                console.error("Error in background image upload:", error);
            }
        }
    };

    const toggleItem = async (itemId: string, currentStatus: boolean) => {
        const itemRef = doc(db, 'groceryItems', itemId);
        const newStatus = !currentStatus;
        
        await updateDoc(itemRef, {
            isDone: newStatus,
            updatedAt: Timestamp.now(),
            ...(user?.uid ? { updatedByUid: user.uid } : {}),
        });

        // Joy Moment: If an item was just marked as done, check if all items are now done
        if (newStatus) {
            const activeItems = items.filter(i => !i.isDone && i.id !== itemId);
            if (activeItems.length === 0) {
                recordJoyMoment();
            }
        }
    };

    const deleteItem = async (itemId: string) => {
        const itemRef = doc(db, 'groceryItems', itemId);
        await deleteDoc(itemRef);
    };

    const updateItem = async (itemId: string, updates: Partial<Pick<GroceryItem, 'name' | 'quantity' | 'imageUrl' | 'imagePath' | 'emoji'>>) => {
        const itemRef = doc(db, 'groceryItems', itemId);
        
        // Find the item to get its current name for the log if name isn't in updates
        const currentItem = items.find(i => i.id === itemId);
        const nameForLog = updates.name || currentItem?.name || 'Unknown Item';

        // Filter out undefined values for Firestore
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        // Optimistic UI Update: Update the local state immediately
        if (currentItem) {
            setItems(prevItems => 
                prevItems.map(item => 
                    item.id === itemId ? { ...item, ...cleanUpdates, updatedAt: new Date() } : item
                )
            );
        }

        await updateDoc(itemRef, {
            ...cleanUpdates,
            updatedAt: Timestamp.now(),
            ...(user?.uid ? { updatedByUid: user.uid } : {}),
        });

        // Update implicit memory with the new details
        if (pairId) {
            // If the name changed, we should remove the old memory entry
            // so it doesn't clutter the suggestions with the "old" name.
            const nameChanged = updates.name && currentItem?.name && updates.name !== currentItem.name;
            
            if (nameChanged && currentItem?.name) {
                deleteMemoryItem(pairId, currentItem.name).catch(() => {});
            }

            upsertMemoryItem(
                pairId,
                updates.name || currentItem?.name || '',
                updates.quantity || currentItem?.quantity,
                updates.imageUrl || currentItem?.imageUrl,
                updates.imagePath || currentItem?.imagePath
            ).catch(err => console.error("Error updating memory on update:", err));
        }

        // Log activity
        if (pairId && user) {
            logActivity(pairId, user.uid, userName, user.photoURL, 'UPDATE', nameForLog).catch(err =>
                console.error("Error logging update activity:", err)
            );
        }
    };

    return {
        items,
        loading,
        addItem,
        toggleItem,
        deleteItem,
        updateItem,
    };
};
