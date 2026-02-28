import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { playSOSAlert } from "@/lib/alertSound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrganizerHikes } from "@/hooks/useOrganizerHikes";
import { useHikersForHike } from "@/hooks/useHikersForHike";
import { useLeadersForHike } from "@/hooks/useLeadersForHike";
import { useIncident } from "@/hooks/useIncident";
import { startHike, endHike } from "@/lib/firestore";
import { toast } from "@/hooks/use-toast";
import HikeForm from "@/components/organizer/HikeForm";
import ManifestTable from "@/components/organizer/ManifestTable";
import LeaderTable from "@/components/organizer/LeaderTable";

export default function OrganizerDashboard() {
  const { user } = useAuthStore();
  const { currentHike, setCurrentHike, loading: hikesLoading, error: hikesError, refetch } = useOrganizerHikes(user?.uid);
  const { hikers, loading: hikersLoading } = useHikersForHike(currentHike?.id);
  const { leaders, loading: leadersLoading } = useLeadersForHike(currentHike?.id);
  const { myIncidents: allIncidents } = useIncident(
    currentHike?.status === "ended" ? null : currentHike?.id
  );
  const { myIncidents: fullIncidentLog } = useIncident(
    currentHike?.status === "ended" ? null : currentHike?.id,
    null,
    { includeResolved: true }
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const registered = hikers?.length ?? 0;
  // Fix BUG-05 / F-18: Checked In excludes checked-out; Active excludes resolved
  const checkedIn = hikers?.filter((h) => h.checkedIn && !h.checkedOut)?.length ?? 0;
  const checkedOut = hikers?.filter((h) => h.checkedOut)?.length ?? 0;
  const activeIncidentCount =
    allIncidents?.filter((i) => i.status !== "resolved")?.length ?? 0;
  const prevIncidentCountRef = useRef(0);
  useEffect(() => {
    if (prevIncidentCountRef.current > 0 && activeIncidentCount > prevIncidentCountRef.current) {
      playSOSAlert();
    }
    prevIncidentCountRef.current = activeIncidentCount;
  }, [activeIncidentCount]);

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
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
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

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Share Invite Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Leader Invite Link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/join/leader/${currentHike.id}` : ""}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/join/leader/${currentHike.id}`;
                      navigator.clipboard?.writeText(url).then(() => toast({ title: "Copied to clipboard" }));
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Hiker Invite Link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/join/hiker/${currentHike.id}` : ""}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/join/hiker/${currentHike.id}`;
                      navigator.clipboard?.writeText(url).then(() => toast({ title: "Copied to clipboard" }));
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 mb-4">
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
                  {activeIncidentCount}
                </p>
                <p className="text-xs text-[var(--color-mid)]">Incidents</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="mb-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="hikers">Hikers</TabsTrigger>
              <TabsTrigger value="leaders">Leaders</TabsTrigger>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              {activeIncidentCount > 0 && (
                <Card className="mb-4 border-[var(--color-danger)]">
                  <CardHeader>
                    <CardTitle className="text-[var(--color-danger)]">
                      Active Incidents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(allIncidents || []).map((inc) => {
                      const coord = inc.coordinates;
                      const hasLoc = coord?.lat != null && coord?.lng != null && (coord.lat !== 0 || coord.lng !== 0);
                      const mapUrl = hasLoc ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}` : null;
                      return (
                        <div key={inc.id} className="py-2 border-b last:border-0">
                          <Link to={`/incident/${inc.id}`} className="font-medium text-[var(--color-accent)] underline">
                            {inc.hikerName}
                          </Link>
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
              {activeIncidentCount === 0 && (
                <p className="text-[var(--color-mid)] py-4 text-center text-sm">
                  No active incidents.
                </p>
              )}
            </TabsContent>
            <TabsContent value="hikers">
              <Card>
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
            </TabsContent>
            <TabsContent value="leaders">
              <Card>
                <CardHeader>
                  <CardTitle>Leaders</CardTitle>
                </CardHeader>
                <CardContent>
                  {leadersLoading ? (
                    <p>Loading...</p>
                  ) : (
                    <LeaderTable leaders={leaders} hike={currentHike} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="incidents">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {(fullIncidentLog || []).length === 0 ? (
                    <p className="text-[var(--color-mid)] py-4 text-center">
                      No incidents yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(fullIncidentLog || []).map((inc) => {
                        const coord = inc.coordinates;
                        const hasLoc = coord?.lat != null && coord?.lng != null;
                        const mapUrl = hasLoc ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}` : null;
                        return (
                          <div key={inc.id} className="py-2 border-b last:border-0">
                            <Link to={`/incident/${inc.id}`} className="font-medium text-[var(--color-accent)] underline">
                              {inc.hikerName} — {inc.type}
                            </Link>
                            <p className="text-sm text-[var(--color-mid)]">
                              {inc.firedAt?.toDate?.()
                                ? inc.firedAt.toDate().toLocaleString()
                                : ""}
                              {" · "}
                              <Badge variant={inc.status === "resolved" ? "secondary" : "destructive"} className="text-xs">
                                {inc.status}
                              </Badge>
                              {" · "}
                              {inc.assignedLeaderName || "Unassigned"}
                            </p>
                            {mapUrl && (
                              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-accent)] underline">
                                Map
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
    </div>
  );
}
