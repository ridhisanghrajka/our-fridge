export interface User {
    uid: string;
    email: string | null;
    name: string | null;
    isPremium: boolean;
    trialStartedAt: Date | null;
    fridgeId: string | null;
    photoURL?: string | null;
    createdAt: Date;
}
