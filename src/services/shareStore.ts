import { create } from 'zustand';

interface ShareState {
  pendingRecipeUrl: string | null;
  setPendingRecipeUrl: (url: string | null) => void;
  clearPendingRecipeUrl: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  pendingRecipeUrl: null,
  setPendingRecipeUrl: (url) => set({ pendingRecipeUrl: url }),
  clearPendingRecipeUrl: () => set({ pendingRecipeUrl: null }),
}));
