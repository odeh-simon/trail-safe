import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveHike } from "@/hooks/useActiveHike";
import { useLeaderProfile } from "@/hooks/useLeaderProfile";
import { useIncident } from "@/hooks/useIncident";
import { useHikersForHike } from "@/hooks/useHikersForHike";
import { joinAsLeader, respondToIncident } from "@/lib/firestore";

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

  const checkedIn = hikers?.filter((h) => h.checkedIn)?.length ?? 0;

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
      <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-4">
        Leader — {hike.name}
      </h1>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <p className="text-lg font-medium">
            Checked in: <span className="text-[var(--color-success)]">{checkedIn}</span> hikers
          </p>
        </CardContent>
      </Card>

      {incidentsLoading ? (
        <p>Loading incidents...</p>
      ) : (
        <>
          {myIncidents?.length > 0 && (
            <Card className="mb-4 border-[var(--color-danger)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-danger)]">
                  Your Incidents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myIncidents.map((inc) => {
                  const coord = inc.coordinates;
                  const hasLoc = coord?.lat != null && coord?.lng != null && (coord.lat !== 0 || coord.lng !== 0);
                  const mapUrl = hasLoc ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}` : null;
                  return (
                  <div key={inc.id} className="p-3 rounded-lg bg-[var(--color-danger)]/10">
                    <p className="font-bold">{inc.hikerName}</p>
                    <p className="text-sm text-[var(--color-mid)]">{inc.type} — {inc.note || "No note"}</p>
                    {hasLoc && (
                      <p className="text-xs text-[var(--color-mid)] mt-1">
                        Location: {coord.lat?.toFixed(5)}, {coord.lng?.toFixed(5)}
                        {mapUrl && (
                          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[var(--color-accent)] underline">
                            Map
                          </a>
                        )}
                      </p>
                    )}
                    <Button
                      className="w-full mt-2 min-h-[48px] bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90"
                      onClick={() => handleRespond(inc.id)}
                    >
                      Respond
                    </Button>
                  </div>
                );
                })}
              </CardContent>
            </Card>
          )}

          {otherIncidents?.length > 0 && (
            <Card className="mb-4 border-[var(--color-warning)]">
              <CardHeader>
                <CardTitle className="text-[var(--color-warning)]">
                  Other Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {otherIncidents.map((inc) => (
                  <div key={inc.id} className="py-2 border-b last:border-0">
                    <p className="font-medium">{inc.hikerName}</p>
                    <p className="text-sm text-[var(--color-mid)]">
                      {inc.type} — {inc.assignedLeaderName || "Unassigned"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {myIncidents?.length === 0 && otherIncidents?.length === 0 && (
            <p className="text-[var(--color-mid)]">No active incidents.</p>
          )}
        </>
      )}
    </div>
  );
}
