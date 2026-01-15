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
                    content: data.content || "[]",
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

    const updateNoteData = async (content: string) => {
        if (!pairId || !userName) return;

        const noteRef = doc(db, 'sharedNotes', pairId);
        await setDoc(noteRef, {
            pairId,
            content,
            updatedAt: Timestamp.now(),
            updatedBy: userName,
        }, { merge: true });
    };

    return {
        note,
        loading,
        updateNote: updateNoteData,
    };
};
