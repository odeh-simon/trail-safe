import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useHike } from "@/hooks/useHike";
import { useHikerProfile } from "@/hooks/useHikerProfile";
import { setUserProfile } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";

const INVITE_HIKE_KEY = "trailsafe_invite_hikeId";

export default function JoinAsHiker() {
  const { hikeId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, setRole } = useAuthStore();
  const { data: hike, loading: hikeLoading, error: hikeError } = useHike(hikeId || null);
  const { hiker, loading: hikerLoading } = useHikerProfile(user?.uid, hikeId || null);

  useEffect(() => {
    if (!hikeId) return;
    sessionStorage.setItem(INVITE_HIKE_KEY, hikeId);
  }, [hikeId]);

  useEffect(() => {
    if (authLoading || hikeLoading || hikerLoading) return;
    if (!user) return;

    const hikeEnded = hike && hike.status === "ended";
    if (hikeError || !hike || hikeEnded) {
      sessionStorage.removeItem(INVITE_HIKE_KEY);
      return;
    }

    const setRoleAndNavigate = async () => {
      await setUserProfile(user.uid, { role: "hiker" });
      setRole("hiker");
      if (hiker) {
        navigate("/hiker", { replace: true });
      } else {
        navigate("/register", { replace: true });
      }
    };

    setRoleAndNavigate();
  }, [authLoading, hikeLoading, hikerLoading, user, hike, hiker, hikeError, navigate, setRole]);

  const hikeEnded = hike && hike.status === "ended";
  const invalidHike = !hikeLoading && (hikeError || !hike || hikeEnded);

  if (invalidHike) {
    sessionStorage.removeItem(INVITE_HIKE_KEY);
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-[var(--color-danger)] font-medium mb-2">
              This invite link is no longer valid.
            </p>
            <p className="text-sm text-[var(--color-mid)]">
              The hike may have ended or the link may be incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <p className="text-[var(--color-dark)]">Joining hike...</p>
    </div>
  );
}
