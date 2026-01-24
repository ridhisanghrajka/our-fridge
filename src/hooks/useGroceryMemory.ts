import { useState, useEffect, useCallback } from 'react';
import { GroceryMemory } from '../types/GroceryMemory';
import { fetchMemoryItems } from '../services/groceryMemory';
import { normalizeGroceryName } from '../utils/stringUtils';

export const useGroceryMemory = (pairId: string | null) => {
    const [memories, setMemories] = useState<GroceryMemory[]>([]);
    const [loading, setLoading] = useState(false);

    const loadMemories = useCallback(async () => {
        if (!pairId) return;
        setLoading(true);
        const items = await fetchMemoryItems(pairId);
        setMemories(items);
        setLoading(false);
    }, [pairId]);

    useEffect(() => {
        loadMemories();
    }, [loadMemories]);

    const getSuggestions = (query: string): GroceryMemory[] => {
        if (!pairId || !query.trim()) return [];

        const normalizedQuery = normalizeGroceryName(query);

        let filtered = memories;
        if (normalizedQuery) {
            filtered = memories.filter(m => {
                const words = m.normalizedName.split(' ');
                // Match if the query matches the start of any word in the item name
                return words.some(word => word.startsWith(normalizedQuery)) || 
                       m.displayName.toLowerCase().startsWith(query.toLowerCase());
            });
        }

        // Ranking: Prefer Recency (lastUsedAt) then Frequency (useCount)
        return filtered
            .sort((a, b) => {
                // Primary: Recency
                const timeDiff = b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
                if (Math.abs(timeDiff) > 1000 * 60 * 60 * 24) { // If more than a day apart
                    return timeDiff;
                }
                // Secondary: Frequency (useCount)
                return b.useCount - a.useCount;
            })
            .slice(0, 5); // Limit to 5 suggestions
    };

    return {
        suggestions: getSuggestions,
        refreshMemories: loadMemories,
        loading
    };
};
