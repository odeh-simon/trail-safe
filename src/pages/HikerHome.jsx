import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveHike } from "@/hooks/useActiveHike";
import { useHikerProfile } from "@/hooks/useHikerProfile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { checkInHiker, checkOutHiker, reCheckInHiker } from "@/lib/firestore";
import { toast } from "@/hooks/use-toast";
import { subscribeToIncident } from "@/lib/firestore";
import SOSButton from "@/components/hiker/SOSButton";
import SOSModal from "@/components/hiker/SOSModal";
import BottomNav from "@/components/layout/BottomNav";

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
  const [activeIncidentId, setActiveIncidentId] = useState(null);
  const [activeIncident, setActiveIncident] = useState(null);

  useEffect(() => {
    if (!activeIncidentId) return;
    return subscribeToIncident(activeIncidentId, (inc) => {
      setActiveIncident(inc);
    });
  }, [activeIncidentId]);

  const handleCheckIn = async () => {
    if (!hiker?.id || !lat || !lng) return;
    setCheckingIn(true);
    await checkInHiker(hiker.id, { lat, lng, accuracy: accuracy ?? undefined });
    toast({ title: "Checked in ✓" });
    setCheckingIn(false);
  };

  const handleCheckOut = async () => {
    if (!hiker?.id) return;
    setCheckingOut(true);
    await checkOutHiker(hiker.id);
    toast({ title: "Checked out", description: "You can re-check in if needed." });
    setCheckingOut(false);
  };

  const handleReCheckIn = async () => {
    if (!hiker?.id) return;
    setCheckingIn(true);
    await reCheckInHiker(hiker.id, lat && lng ? { lat, lng, accuracy } : null);
    toast({ title: "Checked back in ✓" });
    setCheckingIn(false);
  };

  const hikerStatus = !hiker?.checkedIn
    ? "not_checked_in"
    : hiker.checkedOut
      ? "checked_out"
      : "checked_in";

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
          {(hike.groups?.find((g) => g.id === hiker.groupId)?.name || hiker.groupId) && (
            <p className="text-xs text-[var(--color-mid)]">
              Group: {hike.groups?.find((g) => g.id === hiker.groupId)?.name || hiker.groupId}
            </p>
          )}
        </CardHeader>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Check In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hikerStatus === "not_checked_in" && (
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
          {hikerStatus === "checked_in" && (
            <>
              <p className="text-[var(--color-success)] font-medium">✓ Checked in</p>
              {hike.status === "active" && (
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
          )}
          {hikerStatus === "checked_out" && (
            <>
              <p className="text-[var(--color-mid)]">You checked out</p>
              {hike.status === "active" && (
                <>
                  <Button
                    className="w-full min-h-[48px] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                    onClick={handleReCheckIn}
                    disabled={checkingIn || !lat || !lng}
                  >
                    {checkingIn ? "Checking in..." : "Check Back In"}
                  </Button>
                  <p className="text-xs text-[var(--color-mid)]">
                    Checked out by mistake? Check back in.
                  </p>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {hikerStatus === "checked_in" && hike.status === "active" && (
        <div className="mb-4">
          {sosSent && (
            <Card className="mb-4 border-[var(--color-primary)] bg-[var(--color-primary-light)]">
              <CardContent className="pt-6 text-center">
                {activeIncident?.status === "resolved" ? (
                  <p className="text-2xl font-bold text-[var(--color-success)]">
                    Help has arrived
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-[var(--color-primary-dark)]">
                      Help is on the way
                    </p>
                    {activeIncident?.assignedLeaderName && (
                      <>
                        <p className="text-lg mt-2">{activeIncident.assignedLeaderName} is responding</p>
                        {activeIncident.closestLeaderDistanceMeters != null && (
                          <p className="text-3xl font-bold text-[var(--color-accent)] mt-2">
                            ~{activeIncident.closestLeaderDistanceMeters}m away
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-sm text-[var(--color-mid)] mt-4">
                      Stay where you are. Keep this screen visible.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          {!sosSent && sosQueued && (
            <div className="mb-4 p-4 rounded-lg bg-[var(--color-warning)]/20 border border-[var(--color-warning)]">
              <p className="font-medium text-[var(--color-dark)]">
                SOS Queued — will send when signal returns
              </p>
            </div>
          )}
          {!sosSent && (
            <SOSButton
              onPress={() => setSosModalOpen(true)}
              hikeStatus={hike.status}
            />
          )}
          <SOSModal
            open={sosModalOpen}
            onClose={() => setSosModalOpen(false)}
            hike={hike}
            hiker={hiker}
            onSent={(incidentId) => {
              setSosSent(true);
              if (incidentId) setActiveIncidentId(incidentId);
            }}
            onQueued={() => setSosQueued(true)}
            isOnline={isOnline}
          />
        </div>
      )}

      <BottomNav role="hiker" />
    </div>
  );
}
