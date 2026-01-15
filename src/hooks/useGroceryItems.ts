import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase.config';
import { GroceryItem } from '../types/GroceryItem';

export const useGroceryItems = (pairId: string | null, userName: string | null) => {
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);

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
        });

        return () => unsubscribe();
    }, [pairId]);

    const addItem = async (name: string, emoji?: string, quantity?: string, imageUrl?: string, imagePath?: string) => {
        if (!pairId) return;

        const newItem = {
            pairId,
            name,
            emoji: emoji || '',
            quantity: quantity || '',
            imageUrl: imageUrl || '',
            imagePath: imagePath || '',
            isDone: false,
            createdBy: userName || 'User',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, 'groceryItems'), newItem);
    };

    const toggleItem = async (itemId: string, currentStatus: boolean) => {
        const itemRef = doc(db, 'groceryItems', itemId);
        await updateDoc(itemRef, {
            isDone: !currentStatus,
            updatedAt: Timestamp.now(),
        });
    };

    const deleteItem = async (itemId: string) => {
        // Find the item to check if it has an image
        const itemToDelete = items.find(i => i.id === itemId);
        
        // Delete image from storage if it exists
        if (itemToDelete?.imagePath) {
            try {
                const imageRef = ref(storage, itemToDelete.imagePath);
                await deleteObject(imageRef);
            } catch (error) {
                console.error("Error deleting image from storage:", error);
            }
        }

        const itemRef = doc(db, 'groceryItems', itemId);
        await deleteDoc(itemRef);
    };

    const updateItem = async (itemId: string, updates: Partial<Pick<GroceryItem, 'name' | 'quantity' | 'imageUrl' | 'imagePath' | 'emoji'>>) => {
        const itemRef = doc(db, 'groceryItems', itemId);
        
        // If we're updating the image and there's an old one, delete the old one
        if (updates.imagePath) {
            const oldItem = items.find(i => i.id === itemId);
            if (oldItem?.imagePath && oldItem.imagePath !== updates.imagePath) {
                try {
                    const oldImageRef = ref(storage, oldItem.imagePath);
                    await deleteObject(oldImageRef);
                } catch (error) {
                    console.error("Error deleting old image from storage:", error);
                }
            }
        }

        await updateDoc(itemRef, {
            ...updates,
            updatedAt: Timestamp.now(),
        });
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
