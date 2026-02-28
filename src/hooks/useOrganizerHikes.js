import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Fetches hikes for an organizer
 * @param {string|null} organizerId
 * @returns {{ hikes: Array; currentHike: object|null; loading: boolean; error: string|null; refetch: () => Promise<void> }}
 */
export function useOrganizerHikes(organizerId) {
  const [hikes, setHikes] = useState([]);
  const [currentHike, setCurrentHike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHikes = useCallback(async () => {
    if (!organizerId) {
      setHikes([]);
      setCurrentHike(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "hikes"),
        where("organizerId", "==", organizerId)
      );
      const snap = await getDocs(q);
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
      setCurrentHike(active || list[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizerId]);

  useEffect(() => {
    fetchHikes();
  }, [fetchHikes]);

  return { hikes, currentHike, setCurrentHike, loading, error, refetch: fetchHikes };
}
