import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Real-time subscription to organizer hikes. Fix BUG-04.
 * @param {string|null} organizerId
 * @returns {{ hikes: Array; currentHike: object|null; loading: boolean; error: string|null; refetch: () => void }}
 */
export function useOrganizerHikes(organizerId) {
  const [hikes, setHikes] = useState([]);
  const [currentHike, setCurrentHike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organizerId) {
      setHikes([]);
      setCurrentHike(null);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "hikes"),
      where("organizerId", "==", organizerId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0)
          )
          .slice(0, 10);
        setHikes(list);
        const active = list.find(
          (h) => h.status === "active" || h.status === "upcoming"
        );
        setCurrentHike((prev) => {
          if (prev && list.find((h) => h.id === prev.id)) {
            return list.find((h) => h.id === prev.id);
          }
          return active || list[0] || null;
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [organizerId]);

  const refetch = useCallback(() => {}, []);

  return { hikes, currentHike, setCurrentHike, loading, error, refetch };
}
