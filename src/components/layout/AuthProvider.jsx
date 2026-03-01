import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureAuth } from "@/lib/firestore";
import { unlockAudioContext } from "@/lib/alertSound";
import { useAuthStore } from "@/store/useAuthStore";
import { useHikeStore } from "@/store/useHikeStore";

const INVITE_HIKE_KEY = "trailsafe_invite_hikeId";

export default function AuthProvider({ children }) {
  const { setUser, setRole, setLoading } = useAuthStore();
  const resetHikeStore = useHikeStore((s) => s.reset);
  const prevRoleRef = useRef(undefined);

  useEffect(() => {
    const unlockAudio = () => {
      unlockAudioContext();
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubRole = null;

    async function init() {
      try {
        const u = await ensureAuth();
        if (cancelled) return;
        setUser(u);

        unsubRole = onSnapshot(
          doc(db, "users", u.uid),
          (snap) => {
            if (cancelled) return;
            const role = snap.exists() ? (snap.data().role ?? null) : null;
            const hadRole =
              prevRoleRef.current === "hiker" ||
              prevRoleRef.current === "leader" ||
              prevRoleRef.current === "organizer";
            if (hadRole && role == null) {
              try {
                sessionStorage.removeItem(INVITE_HIKE_KEY);
                resetHikeStore();
              } catch (_) {}
            }
            prevRoleRef.current = role;
            setRole(role);
            setLoading(false);
          },
          (err) => {
            console.error("AuthProvider role watch error:", err);
            if (!cancelled) {
              setRole(null);
              setLoading(false);
            }
          }
        );
      } catch (err) {
        console.error("AuthProvider init error:", err);
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      unsubRole?.();
    };
  }, [setUser, setRole, setLoading]);

  return children;
}
