import { Link, useLocation } from "react-router-dom";
import { Home, Heart, Shield } from "lucide-react";

const navClass =
  "flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[72px] text-sm font-medium transition-colors";

/**
 * Bottom nav for hiker and leader
 * @param {{ role: 'hiker' | 'leader'; incidentCount?: number }}
 */
export default function BottomNav({ role, incidentCount = 0 }) {
  const loc = useLocation().pathname;

  if (role === "hiker") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[var(--color-surface)] border-t border-[var(--color-border)] flex">
        <Link
          to="/hiker"
          className={`${navClass} ${loc === "/hiker" ? "text-[var(--color-primary)]" : "text-[var(--color-mid)]"}`}
        >
          <Home className="w-6 h-6" />
          Home
        </Link>
        <Link
          to="/emergency-card"
          className={`${navClass} ${loc === "/emergency-card" ? "text-[var(--color-primary)]" : "text-[var(--color-mid)]"}`}
        >
          <Heart className="w-6 h-6" />
          Emergency Card
        </Link>
      </nav>
    );
  }

  if (role === "leader") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-[var(--color-surface)] border-t border-[var(--color-border)] flex">
        <Link
          to="/leader"
          className={`${navClass} ${loc === "/leader" ? "text-[var(--color-primary)]" : "text-[var(--color-mid)]"}`}
        >
          <Shield className="w-6 h-6" />
          Dashboard
        </Link>
      </nav>
    );
  }

  return null;
}
