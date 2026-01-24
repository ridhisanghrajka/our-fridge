import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { ActivityAction } from '../types/ActivityLog';

export const logActivity = async (
    pairId: string,
    userId: string,
    userName: string,
    userPhoto: string | null | undefined,
    actionType: ActivityAction,
    itemName: string
) => {
    try {
        await addDoc(collection(db, 'activityLogs'), {
            pairId,
            userId,
            userName,
            userPhoto: userPhoto || null,
            actionType,
            itemName,
            timestamp: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};
