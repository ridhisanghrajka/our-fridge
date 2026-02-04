export interface GroceryItem {
    id: string;
    pairId: string;
    name: string;
    emoji?: string;
    quantity?: string;
    imageUrl?: string;
    imagePath?: string;
    isDone: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    recipeId?: string;
}
