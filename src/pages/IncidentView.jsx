import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subscribeToIncident, resolveIncident } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export default function IncidentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [incident, setIncident] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!id) return;
    return subscribeToIncident(id, setIncident);
  }, [id]);

  const handleResolve = async () => {
    if (!id) return;
    setResolving(true);
    try {
      await resolveIncident(id, user?.uid);
      navigate(-1);
    } catch (err) {
      console.error("resolve:", err);
    } finally {
      setResolving(false);
    }
  };

  if (!incident && id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p>Loading incident...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <h1 className="text-xl font-bold text-[var(--color-dark)] mb-2">
          Incident Not Found
        </h1>
        <Link to="/organizer" className="text-[var(--color-accent)] underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const med = incident.hikerMedicalInfo || {};
  const ec = med.emergencyContact || {};
  const coord = incident.coordinates;
  const hasLoc =
    coord?.lat != null &&
    coord?.lng != null &&
    (coord.lat !== 0 || coord.lng !== 0);
  const mapUrl = hasLoc
    ? `https://www.google.com/maps?q=${coord.lat},${coord.lng}`
    : null;
  const isResolved = incident.status === "resolved";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 pb-24 max-w-[430px] mx-auto">
      <div className="mb-4">
        <Link to="/organizer" className="text-sm text-[var(--color-accent)] underline">
          ← Back to Dashboard
        </Link>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{incident.type} Incident</CardTitle>
            <Badge
              variant={
                isResolved ? "secondary" : incident.status === "responding" ? "default" : "destructive"
              }
            >
              {incident.status}
            </Badge>
          </div>
          <p className="text-[var(--color-dark)] font-medium">{incident.hikerName}</p>
          <p className="text-sm text-[var(--color-mid)]">
            {incident.firedAt?.toDate?.()
              ? incident.firedAt.toDate().toLocaleString()
              : "—"}
          </p>
          {incident.note && (
            <p className="text-sm text-[var(--color-mid)] italic">{incident.note}</p>
          )}
        </CardHeader>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Medical Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Blood Type:</strong> {med.bloodType || "—"}</p>
          <p><strong>Conditions:</strong> {med.conditions || "—"}</p>
          <p><strong>Medications:</strong> {med.medications || "—"}</p>
          <p><strong>Allergies:</strong> {med.allergies || "—"}</p>
          {(ec?.name || ec?.phone) && (
            <>
              <p><strong>Emergency Contact:</strong> {ec.name || "—"}</p>
              <p><strong>Contact Phone:</strong> {ec.phone || "—"}</p>
            </>
          )}
        </CardContent>
      </Card>

      {hasLoc && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              {coord.lat?.toFixed(5)}, {coord.lng?.toFixed(5)}
            </p>
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] underline"
              >
                Open in Google Maps
              </a>
            )}
            <Link to={`/compass/${incident.id}`}>
              <Button variant="outline" size="sm" className="mt-2">
                Open Compass
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {incident.assignedLeaderName && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-sm">
              <strong>Assigned Leader:</strong> {incident.assignedLeaderName}
            </p>
            {incident.closestLeaderDistanceMeters != null && (
              <p className="text-sm text-[var(--color-mid)]">
                Distance: ~{incident.closestLeaderDistanceMeters}m
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {incident.timeline?.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {incident.timeline.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--color-mid)]">
                    {e.timestamp?.toDate?.()
                      ? e.timestamp.toDate().toLocaleTimeString()
                      : ""}
                  </span>
                  <span>{e.event}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!isResolved && (
        <Button
          variant="destructive"
          className="w-full min-h-[48px]"
          onClick={handleResolve}
          disabled={resolving}
        >
          {resolving ? "Resolving..." : "Resolve Incident (Override)"}
        </Button>
      )}
    </div>
  );
}
