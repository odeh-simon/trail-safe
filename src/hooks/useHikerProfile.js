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
 * Get hiker profile for current user + hike
 * @param {string|null} userId
 * @param {string|null} hikeId
 * @returns {{ hiker: object|null; loading: boolean; error: string|null }}
 */
export function useHikerProfile(userId, hikeId) {
  const [hiker, setHiker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !hikeId) {
      setHiker(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "hikers"),
      where("userId", "==", userId),
      where("hikeId", "==", hikeId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0];
        setHiker(doc ? { id: doc.id, ...doc.data() } : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId, hikeId]);

  return { hiker, loading, error };
}
