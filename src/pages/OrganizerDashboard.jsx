import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrganizerHikes } from "@/hooks/useOrganizerHikes";
import { useHikersForHike } from "@/hooks/useHikersForHike";
import { useIncident } from "@/hooks/useIncident";
import { startHike, endHike } from "@/lib/firestore";
import { toast } from "@/hooks/use-toast";
import HikeForm from "@/components/organizer/HikeForm";
import ManifestTable from "@/components/organizer/ManifestTable";

export default function OrganizerDashboard() {
  const { user } = useAuthStore();
  const { currentHike, setCurrentHike, loading: hikesLoading, error: hikesError, refetch } = useOrganizerHikes(user?.uid);
  const { hikers, loading: hikersLoading } = useHikersForHike(currentHike?.id);
  const { myIncidents } = useIncident(currentHike?.id);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const registered = hikers?.length ?? 0;
  const checkedIn = hikers?.filter((h) => h.checkedIn)?.length ?? 0;
  const checkedOut = hikers?.filter((h) => h.checkedOut)?.length ?? 0;
  const activeIncidents = myIncidents?.length ?? 0;

  const handleStartHike = async () => {
    if (!currentHike?.id) return;
    setStarting(true);
    try {
      await startHike(currentHike.id);
      await refetch();
      toast({ title: "Hike started", description: "Hikers can now check in." });
    } catch (err) {
      toast({ title: "Failed to start hike", description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const handleEndHike = async () => {
    if (!currentHike?.id) return;
    setEnding(true);
    try {
      await endHike(currentHike.id);
      await refetch();
      toast({ title: "Hike ended" });
    } catch (err) {
      toast({ title: "Failed to end hike", description: err.message, variant: "destructive" });
    } finally {
      setEnding(false);
    }
  };

  const handleHikeCreated = async () => {
    setShowCreateForm(false);
    await refetch();
  };

  if (hikesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 pb-24 max-w-[430px] mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-4">
        Organizer Dashboard
      </h1>

      {hikesError && (
        <p className="text-[var(--color-danger)] mb-4">{hikesError}</p>
      )}

      {!currentHike && !showCreateForm && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-[var(--color-mid)] mb-4">No hike yet.</p>
            <Button
              className="w-full min-h-[48px]"
              onClick={() => setShowCreateForm(true)}
            >
              Create Hike
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <div className="mb-6">
          <HikeForm onCreated={handleHikeCreated} />
          <Button
            variant="outline"
            className="w-full mt-2 min-h-[48px]"
            onClick={() => setShowCreateForm(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {currentHike && !showCreateForm && (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{currentHike.name}</CardTitle>
                <Badge
                  variant={
                    currentHike.status === "active"
                      ? "default"
                      : currentHike.status === "ended"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {currentHike.status}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-mid)]">{currentHike.trail}</p>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-dark)]">
                  {registered}
                </p>
                <p className="text-xs text-[var(--color-mid)]">Registered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-success)]">
                  {checkedIn}
                </p>
                <p className="text-xs text-[var(--color-mid)]">In</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-mid)]">
                  {checkedOut}
                </p>
                <p className="text-xs text-[var(--color-mid)]">Out</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-danger)]">
                  {activeIncidents}
                </p>
                <p className="text-xs text-[var(--color-mid)]">Incidents</p>
              </CardContent>
            </Card>
          </div>

          {activeIncidents > 0 && (
            <Card className="mb-4 border-[var(--color-danger)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-danger)]">
                  Active Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myIncidents.map((inc) => {
                  const coord = inc.coordinates;
                  const hasLoc = coord?.lat != null && coord?.lng != null && (coord.lat !== 0 || coord.lng !== 0);
                  const mapUrl = hasLoc ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}` : null;
                  return (
                  <div
                    key={inc.id}
                    className="py-2 border-b last:border-0"
                  >
                    <p className="font-medium">{inc.hikerName}</p>
                    <p className="text-sm text-[var(--color-mid)]">
                      {inc.type} — {inc.assignedLeaderName || "Unassigned"}
                    </p>
                    {hasLoc && (
                      <p className="text-xs text-[var(--color-mid)] mt-1">
                        {coord.lat?.toFixed(5)}, {coord.lng?.toFixed(5)}
                        {mapUrl && (
                          <>
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--color-accent)] underline">
                              Maps
                            </a>
                            <Link to={`/compass/${inc.id}`} className="ml-2 text-[var(--color-accent)] underline">
                              Direction
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                );
                })}
              </CardContent>
            </Card>
          )}

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Hiker Manifest</CardTitle>
            </CardHeader>
            <CardContent>
              {hikersLoading ? (
                <p>Loading...</p>
              ) : (
                <ManifestTable hikers={hikers} hike={currentHike} />
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {currentHike.status === "upcoming" && (
              <>
                <p className="text-xs text-[var(--color-mid)]">
                  No minimum hikers or leaders required. Start when ready — hikers can then check in.
                </p>
                <Button
                  className="flex-1 min-h-[48px] w-full"
                  onClick={handleStartHike}
                  disabled={starting}
                  title="Start the hike so registered hikers can check in"
                >
                  {starting ? "Starting..." : "Start Hike"}
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {currentHike.status === "active" && (
              <Button
                variant="destructive"
                className="flex-1 min-h-[48px]"
                onClick={handleEndHike}
                disabled={ending}
                title="End the hike"
              >
                {ending ? "Ending..." : "End Hike"}
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-2 min-h-[48px]"
            onClick={() => setShowCreateForm(true)}
          >
            Create New Hike
          </Button>
        </>
      )}
    </div>
  );
}
