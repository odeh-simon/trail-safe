import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { setUserProfile } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading, setRole } = useAuthStore();

  const handleRoleSelect = async (role) => {
    if (!user) return;
    await setUserProfile(user.uid, { role });
    setRole(role);
    if (role === "organizer") navigate("/organizer");
    else if (role === "leader") navigate("/leader");
    else if (role === "hiker") navigate("/register");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-dark)]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Trail Safe
        </h1>
        <p className="text-white/90 text-lg mb-12">Hike together. Stay safe.</p>

        <div className="w-full max-w-sm space-y-4">
          <Button
            onClick={() => handleRoleSelect("organizer")}
            className="w-full h-14 rounded-lg text-lg bg-white text-[var(--color-primary-dark)] hover:bg-white/90 min-h-[48px]"
            size="lg"
          >
            I'm Organizing
          </Button>
          <Button
            onClick={() => handleRoleSelect("leader")}
            className="w-full h-14 rounded-lg text-lg bg-white text-[var(--color-primary-dark)] hover:bg-white/90 min-h-[48px]"
            size="lg"
          >
            I'm a Leader
          </Button>
          <Button
            onClick={() => handleRoleSelect("hiker")}
            className="w-full h-14 rounded-lg text-lg bg-white text-[var(--color-primary-dark)] hover:bg-white/90 min-h-[48px]"
            size="lg"
          >
            I'm Hiking Today
          </Button>
        </div>
      </div>
    </div>
  );
}
