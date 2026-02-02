import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SharedNote } from '../types/SharedNote';

export const useSharedNote = (pairId: string | null, user: { uid: string, name: string | null } | null) => {
    const [note, setNote] = useState<SharedNote | null>(null);
    const [loading, setLoading] = useState(true);
    const userName = user?.name || 'User';

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
                    updatedByUid: data.updatedByUid,
                });
            } else {
                setNote(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pairId]);

    const updateNoteData = async (content: string) => {
        if (!pairId || !user) return;

        const noteRef = doc(db, 'sharedNotes', pairId);
        await setDoc(noteRef, {
            pairId,
            content,
            updatedAt: Timestamp.now(),
            updatedBy: userName,
            updatedByUid: user.uid,
        }, { merge: true });
    };

    return {
        note,
        loading,
        updateNote: updateNoteData,
    };
};
