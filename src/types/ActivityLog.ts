export type ActivityAction = 'ADD' | 'UPDATE' | 'REMOVE';

export interface ActivityLog {
    id: string;
    pairId: string;
    userId: string;
    userName: string;
    userPhoto: string | null;
    actionType: ActivityAction;
    itemName: string;
    timestamp: Date;
}
