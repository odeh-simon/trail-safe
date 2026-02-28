import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribe to all leaders for a hike
 * @param {string|null} hikeId
 * @returns {{ leaders: Array; loading: boolean; error: string|null }}
 */
export function useLeadersForHike(hikeId) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hikeId) {
      setLeaders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "leaders"),
      where("hikeId", "==", hikeId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLeaders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("useLeadersForHike:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [hikeId]);

  return { leaders, loading, error };
}
