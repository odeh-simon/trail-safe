import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Real-time subscription to the current active or upcoming hike
 * (for registration and hiker check-in; updates when organizer starts hike)
 * @returns {{ hike: object|null; loading: boolean; error: string|null }}
 */
export function useActiveHike() {
  const [hike, setHike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "hikes"),
      where("status", "in", ["active", "upcoming"])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((h) => {
            if (h.status === "active") return true;
            const createdAt = h.createdAt?.toMillis?.() ?? 0;
            return createdAt > cutoff;
          })
          .filter((h) => h.status === "active" || h.status === "upcoming")
          .sort((a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));
        const active = docs.find((h) => h.status === "active");
        const upcoming = docs.find((h) => h.status === "upcoming");
        setHike(active || upcoming || null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setHike(null);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { hike, loading, error };
}
