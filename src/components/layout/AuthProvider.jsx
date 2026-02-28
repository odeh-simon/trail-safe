import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureAuth } from "@/lib/firestore";
import { unlockAudioContext } from "@/lib/alertSound";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthProvider({ children }) {
  const { setUser, setRole, setLoading } = useAuthStore();

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
