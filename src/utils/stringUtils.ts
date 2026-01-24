/**
 * Normalizes a grocery item name for indexing and matching.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes special characters/punctuation (except spaces)
 * - Collapses multiple spaces into single space
 * - Replaces spaces with hyphens for the document ID
 */
export const normalizeGroceryName = (name: string): string => {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .trim();                    // Final trim
};

/**
 * Creates a stable document ID from a normalized name.
 */
export const getMemoryId = (normalizedName: string): string => {
    return normalizedName.replace(/\s+/g, '-');
};
