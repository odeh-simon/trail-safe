import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribe to a hike document
 * @param {string|null} hikeId
 * @returns {{ data: object|null; loading: boolean; error: string|null }}
 */
export function useHike(hikeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hikeId) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "hikes", hikeId),
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [hikeId]);

  return { data, loading, error };
}
