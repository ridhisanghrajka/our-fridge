import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.config';
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

    const addItem = async (name: string, emoji?: string, quantity?: string) => {
        if (!pairId) return;

        const newItem = {
            pairId,
            name,
            emoji: emoji || '',
            quantity: quantity || '',
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

    return {
        items,
        loading,
        addItem,
        toggleItem,
    };
};
