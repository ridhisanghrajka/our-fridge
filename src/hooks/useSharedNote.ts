import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase.config';
import { SharedNote } from '../types/SharedNote';

export const useSharedNote = (pairId: string | null, userName: string | null) => {
    const [note, setNote] = useState<SharedNote | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!pairId) {
            setNote(null);
            setLoading(false);
            return;
        }

        const noteRef = doc(db, 'sharedNotes', pairId);
        const unsubscribe = onSnapshot(noteRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setNote({
                    pairId: data.pairId,
                    text: data.text,
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    updatedBy: data.updatedBy,
                });
            } else {
                setNote(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pairId]);

    const updateNote = async (text: string) => {
        if (!pairId || !userName) return;

        const noteRef = doc(db, 'sharedNotes', pairId);
        await setDoc(noteRef, {
            pairId,
            text,
            updatedAt: Timestamp.now(),
            updatedBy: userName,
        });
    };

    return {
        note,
        loading,
        updateNote,
    };
};
