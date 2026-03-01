import { Link, useLocation } from "react-router-dom";
import { Home, Heart, Shield } from "lucide-react";

const HIKER_LINKS = [
  { to: "/hiker", label: "Home", icon: <Home className="w-5 h-5" /> },
  { to: "/emergency-card", label: "Emergency Card", icon: <Heart className="w-5 h-5" /> },
];

const LEADER_LINKS = [
  { to: "/leader", label: "Dashboard", icon: <Shield className="w-5 h-5" /> },
];

/**
 * Navigation bar — bottom on mobile, top on desktop.
 * @param {{ role: 'hiker' | 'leader'; incidentCount?: number }}
 */
export default function BottomNav({ role, incidentCount = 0 }) {
  const pathname = useLocation().pathname;
  const links = role === "hiker" ? HIKER_LINKS : role === "leader" ? LEADER_LINKS : [];

  if (!links.length) return null;

  const navLinks = links.map((link) => {
    const isActive = pathname === link.to;
    const showBadge = link.label === "Dashboard" && incidentCount > 0;
    return (
      <Link
        key={link.to}
        to={link.to}
        className={`
          flex items-center gap-2 font-medium transition-colors relative
          flex-col text-xs py-2 px-4
          md:flex-row md:text-sm md:py-0 md:px-0
          ${isActive
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-mid)] hover:text-[var(--color-dark)]"
          }
        `}
      >
        {link.icon}
        <span>{link.label}</span>
        {showBadge && (
          <span className="
            bg-[var(--color-danger)] text-white text-xs font-bold rounded-full
            min-w-[1.25rem] h-5 flex items-center justify-center px-1
            absolute top-1 right-3
            md:static md:top-auto md:right-auto
          ">
            {incidentCount}
          </span>
        )}
      </Link>
    );
  });

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-around items-center z-40 safe-area-bottom">
        {navLinks}
      </nav>

      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-40 px-6 h-14 items-center gap-8 shadow-sm">
        <Link to="/" className="font-bold text-[var(--color-primary)] text-lg mr-2 flex items-center gap-2">
          🏔️ Trail Safe
        </Link>
        <div className="flex items-center gap-6">
          {navLinks}
        </div>
      </header>
    </>
  );
}
