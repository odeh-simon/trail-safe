import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Subscribe to incidents for a hike
 * @param {string|null} hikeId
 * @param {string|null} [leaderId] - Filter for incidents assigned to this leader
 * @param {{ includeResolved?: boolean }} [opts] - If includeResolved, return all incidents
 * @returns {{ myIncidents: Array; otherIncidents: Array; allIncidents: Array; loading: boolean; error: string|null }}
 */
export function useIncident(hikeId, leaderId = null, { includeResolved = false } = {}) {
  const [myIncidents, setMyIncidents] = useState([]);
  const [otherIncidents, setOtherIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hikeId) {
      setMyIncidents([]);
      setOtherIncidents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "incidents"),
      where("hikeId", "==", hikeId),
      orderBy("firedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        let all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!includeResolved) {
          all = all.filter((i) => i.status === "active" || i.status === "responding");
        }
        if (leaderId) {
          setMyIncidents(all.filter((i) => i.assignedLeaderId === leaderId));
          setOtherIncidents(all.filter((i) => i.assignedLeaderId !== leaderId));
        } else {
          setMyIncidents(all);
          setOtherIncidents([]);
        }
        setLoading(false);
      },
      (err) => {
        // Fix BUG-11: Log missing index / failed-precondition
        console.error("useIncident onSnapshot error:", err?.code, err?.message);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [hikeId, leaderId, includeResolved]);

  return { myIncidents, otherIncidents, loading, error };
}
