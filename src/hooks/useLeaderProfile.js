import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Get leader doc for user + hike
 * @param {string|null} userId
 * @param {string|null} hikeId
 * @returns {{ leader: object|null; loading: boolean; error: string|null }}
 */
export function useLeaderProfile(userId, hikeId) {
  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !hikeId) {
      setLeader(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "leaders"),
      where("userId", "==", userId),
      where("hikeId", "==", hikeId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0];
        setLeader(doc ? { id: doc.id, ...doc.data() } : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId, hikeId]);

  return { leader, loading, error };
}
