export interface GroceryMemory {
    id: string; // normalized_name
    normalizedName: string;
    displayName: string;
    imageUrl?: string;
    imagePath?: string;
    quantity?: string;
    useCount: number;
    lastUsedAt: Date;
}
