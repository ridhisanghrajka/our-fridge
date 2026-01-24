import { collection, doc, getDoc, setDoc, getDocs, query, where, orderBy, limit, Timestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { GroceryMemory } from '../types/GroceryMemory';
import { normalizeGroceryName, getMemoryId } from '../utils/stringUtils';

const MEMORY_LIMIT = 30;
const FRESHNESS_DAYS = 90;

// Session-based cache
let memoryCache: { [pairId: string]: { items: GroceryMemory[], timestamp: number } } = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Upsert an item into the pair's memory.
 * This happens invisibly when a user adds an item to their list.
 */
export const upsertMemoryItem = async (
    pairId: string,
    name: string,
    quantity?: string,
    imageUrl?: string,
    imagePath?: string
) => {
    if (!pairId) return;

    const normalized = normalizeGroceryName(name);
    if (!normalized) return;

    const memoryId = getMemoryId(normalized);
    const memoryRef = doc(db, 'pairs', pairId, 'item_memory', memoryId);

    const updateData: any = {
        normalizedName: normalized,
        displayName: name.trim(),
        useCount: increment(1),
        lastUsedAt: Timestamp.now(),
    };

    // Only update these if provided (latest wins)
    if (quantity) updateData.quantity = quantity;
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (imagePath) updateData.imagePath = imagePath;

    try {
        await setDoc(memoryRef, updateData, { merge: true });
        // Clear cache for this pair so it refreshes on next fetch
        delete memoryCache[pairId];
    } catch (error) {
        console.error("Error upserting memory item:", error);
    }
};

/**
 * Fetch top memory items for a pair, with session caching and decay filter.
 */
export const fetchMemoryItems = async (pairId: string): Promise<GroceryMemory[]> => {
    if (!pairId) return [];

    // Check session cache
    const cached = memoryCache[pairId];
    if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY_MS)) {
        return cached.items;
    }

    const memoryRef = collection(db, 'pairs', pairId, 'item_memory');
    
    // Freshness filter: items used in the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - FRESHNESS_DAYS);

    const q = query(
        memoryRef,
        where('lastUsedAt', '>=', Timestamp.fromDate(ninetyDaysAgo)),
        orderBy('lastUsedAt', 'desc'),
        limit(MEMORY_LIMIT)
    );

    try {
        const snapshot = await getDocs(q);
        const items: GroceryMemory[] = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
                id: doc.id,
                normalizedName: data.normalizedName,
                displayName: data.displayName,
                imageUrl: data.imageUrl,
                imagePath: data.imagePath,
                quantity: data.quantity,
                useCount: data.useCount,
                lastUsedAt: data.lastUsedAt.toDate(),
            });
        });

        // Store in session cache
        memoryCache[pairId] = {
            items,
            timestamp: Date.now()
        };

        return items;
    } catch (error) {
        console.error("Error fetching memory items:", error);
        return [];
    }
};
