import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { GroceryItem } from '../types/GroceryItem';
import { User } from '../types/User';
import { upsertMemoryItem, deleteMemoryItem } from '../services/groceryMemory';
import { logActivity } from '../services/activity';

export const useGroceryItems = (pairId: string | null, user: User | null) => {
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const userName = user?.name || 'User';

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

        const newItemData: any = {
            pairId,
            userId: user?.uid || '',
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

        const docRef = await addDoc(collection(db, 'groceryItems'), newItemData);

        // Log activity
        if (user) {
            logActivity(pairId, user.uid, userName, user.photoURL, 'ADD', name).catch(err =>
                console.error("Error logging add activity:", err)
            );
        }

        // Update implicit memory
        upsertMemoryItem(pairId, name, quantity, imageUrl, imagePath).catch(err => 
            console.error("Error updating memory:", err)
        );

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

                // Also update the memory with the permanent URL
                upsertMemoryItem(pairId, name, quantity, downloadUrl, filename).catch(() => {});
            } catch (error) {
                console.error("Error in background image upload:", error);
            }
        }
    };

    const toggleItem = async (itemId: string, currentStatus: boolean) => {
        const itemRef = doc(db, 'groceryItems', itemId);
        await updateDoc(itemRef, {
            isDone: !currentStatus,
            updatedAt: Timestamp.now(),
        });
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
