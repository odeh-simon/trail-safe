import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { playSOSAlert } from "@/lib/alertSound";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveHike } from "@/hooks/useActiveHike";
import { useLeaderProfile } from "@/hooks/useLeaderProfile";
import { useIncident } from "@/hooks/useIncident";
import { useHikersForHike } from "@/hooks/useHikersForHike";
import { joinAsLeader, respondToIncident } from "@/lib/firestore";
import BottomNav from "@/components/layout/BottomNav";

export default function LeaderHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hike } = useActiveHike();
  const { leader, loading: leaderLoading } = useLeaderProfile(user?.uid, hike?.id);
  const { myIncidents, otherIncidents, loading: incidentsLoading } = useIncident(
    hike?.id,
    leader?.id ? leader.userId : null
  );
  const { hikers } = useHikersForHike(hike?.id);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!hike || !user) return;
    setJoining(true);
    await joinAsLeader(hike.id, user.uid, "Leader", "");
    setJoining(false);
  };

  const handleRespond = async (incidentId) => {
    if (!leader) return;
    await respondToIncident(incidentId, leader.userId, leader.name);
    navigate(`/compass/${incidentId}`);
  };

  const checkedIn = hikers?.filter((h) => h.checkedIn && !h.checkedOut)?.length ?? 0;
  const allIncidents = [...(myIncidents || []), ...(otherIncidents || [])];
  const activeCount = allIncidents.filter((i) => i.status !== "resolved").length;
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (prevCountRef.current > 0 && activeCount > prevCountRef.current) {
      playSOSAlert();
    }
    prevCountRef.current = activeCount;
  }, [activeCount]);

  if (leaderLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!hike) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <p className="text-[var(--color-mid)] text-center">No active hike.</p>
      </div>
    );
  }

  if (!leader) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <h1 className="text-xl font-bold mb-4">{hike.name}</h1>
        <p className="text-[var(--color-mid)] text-center mb-6">
          Join as a leader to receive SOS alerts.
        </p>
        <Button
          className="min-h-[48px]"
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? "Joining..." : "Join as Leader"}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 pb-24 max-w-[430px] mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-1">
        {hike.name}
      </h1>
      <p className="text-[var(--color-mid)] mb-4">
        {leader.name}
        {leader.roleTitle && (
          <Badge variant="outline" className="ml-2 text-xs">
            {leader.roleTitle}
          </Badge>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-[var(--color-success)]">{checkedIn}</p>
            <p className="text-xs text-[var(--color-mid)]">Checked In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-[var(--color-danger)]">{allIncidents.length}</p>
            <p className="text-xs text-[var(--color-mid)]">Active Incidents</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents" className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="hikers">Hikers</TabsTrigger>
        </TabsList>
        <TabsContent value="incidents">
          {incidentsLoading ? (
            <p>Loading incidents...</p>
          ) : allIncidents.length === 0 ? (
            <p className="text-[var(--color-mid)] py-4">No active incidents.</p>
          ) : (
            <div className="space-y-3">
              {allIncidents.map((inc) => {
                const isMine = inc.assignedLeaderId === leader.userId;
                const coord = inc.coordinates;
                const hasLoc = coord?.lat != null && coord?.lng != null && (coord.lat !== 0 || coord.lng !== 0);
                const mapUrl = hasLoc ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}` : null;
                return (
                  <Card
                    key={inc.id}
                    className={isMine ? "border-[var(--color-danger)]" : "border-[var(--color-warning)]"}
                  >
                    <CardContent className="pt-4">
                      <p className="font-bold">{inc.hikerName}</p>
                      <p className="text-sm text-[var(--color-mid)]">
                        {inc.type} — {inc.note || "No note"}
                      </p>
                      <p className="text-xs text-[var(--color-mid)]">
                        {inc.assignedLeaderName || "Unassigned"}
                        {inc.closestLeaderDistanceMeters != null && ` · ~${inc.closestLeaderDistanceMeters}m`}
                      </p>
                      {hasLoc && (
                        <p className="text-xs text-[var(--color-mid)] mt-1">
                          {coord.lat?.toFixed(5)}, {coord.lng?.toFixed(5)}
                          {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--color-accent)] underline">
                              Map
                            </a>
                          )}
                          <Link to={`/compass/${inc.id}`} className="ml-2 text-[var(--color-accent)] underline">
                            Compass
                          </Link>
                        </p>
                      )}
                      {isMine ? (
                        <div className="flex gap-2 mt-2">
                          {inc.status === "active" && (
                            <Button
                              size="sm"
                              className="flex-1 bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90"
                              onClick={() => handleRespond(inc.id)}
                            >
                              Respond
                            </Button>
                          )}
                          <Link to={`/compass/${inc.id}`}>
                            <Button size="sm" variant="outline">
                              Open Compass
                            </Button>
                          </Link>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="hikers">
          <Card>
            <CardContent className="pt-4">
              {(hikers || [])
                .filter((h) => h.checkedIn && !h.checkedOut)
                .length === 0 ? (
                <p className="text-[var(--color-mid)] py-4">No hikers checked in.</p>
              ) : (
                <ul className="space-y-2">
                  {(hikers || [])
                    .filter((h) => h.checkedIn && !h.checkedOut)
                    .map((h) => (
                      <li key={h.id} className="flex justify-between py-1 border-b last:border-0">
                        <span className="font-medium">{h.name}</span>
                        <Link to={`/emergency-card?hikerId=${h.id}`} className="text-xs text-[var(--color-accent)] underline">
                          Card
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BottomNav role="leader" incidentCount={activeCount} />
    </div>
  );
}
