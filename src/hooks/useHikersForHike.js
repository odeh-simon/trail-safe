import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribe to hikers for a hike
 * @param {string|null} hikeId
 * @returns {{ hikers: Array; loading: boolean; error: string|null }}
 */
export function useHikersForHike(hikeId) {
  const [hikers, setHikers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hikeId) {
      setHikers([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "hikers"),
      where("hikeId", "==", hikeId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(
          (a, b) =>
            (a.registeredAt?.toMillis?.() ?? 0) -
            (b.registeredAt?.toMillis?.() ?? 0)
        );
        setHikers(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [hikeId]);

  return { hikers, loading, error };
}
