import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ensureAuth, getUserRole } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Ensures anonymous auth on load and fetches role. Redirects authenticated users with role.
 */
export default function AuthProvider({ children }) {
  const { user, role, setUser, setRole, setLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unlockAudio = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume?.();
      }
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
    return () => document.removeEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const u = await ensureAuth();
        if (cancelled) return;
        setUser(u);

        const r = await getUserRole(u.uid);
        if (cancelled) return;
        setRole(r);

        // Do not auto-redirect from Landing — users can always visit / to switch roles
      } catch (err) {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [setUser, setRole, setLoading, navigate, location.pathname]);

  return children;
}
