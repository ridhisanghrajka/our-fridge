export interface RecipeIngredient {
    id: string;
    name: string;
    quantity?: string;
    imageUrl?: string;
    imagePath?: string;
    addedToList: boolean; // Track if this ingredient has been added to the grocery list
}

export interface Recipe {
    id: string;
    pairId: string;
    name: string;
    ingredients: RecipeIngredient[];
    notes?: string;
    imageUrl?: string;
    imagePath?: string;
    createdBy: string;
    createdByName: string;
    createdAt: Date;
    updatedAt: Date;
}
