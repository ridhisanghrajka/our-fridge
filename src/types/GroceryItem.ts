export interface GroceryItem {
    id: string;
    pairId: string;
    name: string;
    emoji?: string;
    quantity?: string;
    isDone: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
