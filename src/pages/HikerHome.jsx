import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveHike } from "@/hooks/useActiveHike";
import { useHikerProfile } from "@/hooks/useHikerProfile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { checkInHiker, checkOutHiker } from "@/lib/firestore";
import SOSButton from "@/components/hiker/SOSButton";
import SOSModal from "@/components/hiker/SOSModal";

export default function HikerHome() {
  const { user } = useAuthStore();
  const { hike, loading: hikeLoading } = useActiveHike();
  const { hiker, loading: hikerLoading } = useHikerProfile(user?.uid, hike?.id);
  const { lat, lng, accuracy, error: gpsError } = useGeolocation();
  const isOnline = useOnlineStatus();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sosQueued, setSosQueued] = useState(false);

  const handleCheckIn = async () => {
    if (!hiker?.id || !lat || !lng) return;
    setCheckingIn(true);
    await checkInHiker(hiker.id, { lat, lng, accuracy: accuracy ?? undefined });
    setCheckingIn(false);
  };

  const handleCheckOut = async () => {
    if (!hiker?.id) return;
    setCheckingOut(true);
    await checkOutHiker(hiker.id);
    setCheckingOut(false);
  };

  if (hikeLoading || hikerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!hike) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <p className="text-[var(--color-mid)] text-center mb-4">
          No active hike. Register for an upcoming hike first.
        </p>
        <Button asChild>
          <Link to="/register">Register</Link>
        </Button>
      </div>
    );
  }

  if (!hiker) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <p className="text-[var(--color-mid)] text-center mb-4">
          You need to register for this hike first.
        </p>
        <Button asChild>
          <Link to="/register">Register</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 pb-32 max-w-[430px] mx-auto">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{hike.name}</CardTitle>
            <Badge
              variant={
                hike.status === "active" ? "default" : hike.status === "ended" ? "secondary" : "outline"
              }
            >
              {hike.status}
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-mid)]">{hike.trail}</p>
          {hiker.groupId && (
            <p className="text-xs text-[var(--color-mid)]">Group: {hiker.groupId}</p>
          )}
        </CardHeader>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Check In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hiker.checkedIn ? (
            <>
              <p className="text-[var(--color-success)] font-medium">Checked in</p>
              {hike.status === "active" && !hiker.checkedOut && (
                <Button
                  variant="outline"
                  className="w-full min-h-[48px]"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Checking out..." : "Check Out"}
                </Button>
              )}
            </>
          ) : (
            <>
              {accuracy != null && (
                <p className="text-sm text-[var(--color-mid)]">GPS: ±{Math.round(accuracy)}m</p>
              )}
              {gpsError && (
                <p className="text-sm text-[var(--color-danger)]">{gpsError}</p>
              )}
              <Button
                className="w-full min-h-[48px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                onClick={handleCheckIn}
                disabled={!lat || !lng || checkingIn || hike.status !== "active"}
              >
                {checkingIn ? "Checking in..." : "Check In"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {hiker.checkedIn && hike.status === "active" && !hiker.checkedOut && (
        <div className="mb-4">
          {sosSent && (
            <div className="mb-4 p-4 rounded-lg bg-[var(--color-primary-light)] border border-[var(--color-primary)]">
              <p className="font-medium text-[var(--color-primary-dark)]">
                SOS Sent — Help is on the way
              </p>
            </div>
          )}
          {sosQueued && (
            <div className="mb-4 p-4 rounded-lg bg-[var(--color-warning)]/20 border border-[var(--color-warning)]">
              <p className="font-medium text-[var(--color-dark)]">
                SOS Queued — will send when signal returns
              </p>
            </div>
          )}
          <SOSButton
            onPress={() => setSosModalOpen(true)}
            hikeStatus={hike.status}
          />
          <SOSModal
            open={sosModalOpen}
            onClose={() => setSosModalOpen(false)}
            hike={hike}
            hiker={hiker}
            onSent={() => setSosSent(true)}
            onQueued={() => setSosQueued(true)}
            isOnline={isOnline}
          />
        </div>
      )}

      <div className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto px-4">
        <Button variant="outline" asChild className="w-full min-h-[48px]">
          <Link to="/emergency-card">Emergency Card</Link>
        </Button>
      </div>
    </div>
  );
}
