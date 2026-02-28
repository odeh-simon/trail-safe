import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCompass } from "@/hooks/useCompass";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getDistance, getBearing } from "@/lib/haversine";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateLeaderLocation, respondToIncident, resolveIncident } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLeaderProfile } from "@/hooks/useLeaderProfile";

export default function Compass() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [incident, setIncident] = useState(null);
  const [responding, setResponding] = useState(false);
  const [resolving, setResolving] = useState(false);
  const { heading, requestPermission } = useCompass();
  const { lat, lng } = useGeolocation();
  const intervalRef = useRef(null);

  const hikerLat = incident?.coordinates?.lat;
  const hikerLng = incident?.coordinates?.lng;
  const hasValidHikerLocation =
    hikerLat != null &&
    hikerLng != null &&
    (hikerLat !== 0 || hikerLng !== 0) &&
    Math.abs(hikerLat) <= 90 &&
    Math.abs(hikerLng) <= 180;
  const mapUrl =
    hasValidHikerLocation
      ? `https://www.google.com/maps?q=${hikerLat},${hikerLng}`
      : null;
  const { leader } = useLeaderProfile(user?.uid, incident?.hikeId);

  const distance =
    lat != null && lng != null && hasValidHikerLocation
      ? Math.round(getDistance(lat, lng, hikerLat, hikerLng))
      : null;

  const bearing =
    lat != null && lng != null && hasValidHikerLocation
      ? getBearing(lat, lng, hikerLat, hikerLng)
      : null;

  const arrowRotation =
    heading != null && bearing != null ? (bearing - heading + 360) % 360 : 0;

  useEffect(() => {
    if (!incidentId) return;
    const unsub = onSnapshot(doc(db, "incidents", incidentId), (snap) => {
      setIncident(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return () => unsub();
  }, [incidentId]);

  useEffect(() => {
    if (!leader?.id || !lat || !lng) return;
    updateLeaderLocation(leader.id, { lat, lng, accuracy: 10 });
    intervalRef.current = setInterval(() => {
      updateLeaderLocation(leader.id, { lat, lng, accuracy: 10 });
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [leader?.id, lat, lng]);

  const handleRespond = async () => {
    if (!incidentId || !leader) return;
    setResponding(true);
    await respondToIncident(incidentId, leader.userId, leader.name);
    setResponding(false);
  };

  const handleArrived = async () => {
    if (!incidentId) return;
    setResolving(true);
    await resolveIncident(incidentId);
    setResolving(false);
    navigate("/leader");
  };

  const [compassReady, setCompassReady] = useState(false);

  if (!incident) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!compassReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] p-6">
        <p className="text-white mb-6">Enable compass to navigate.</p>
        <Button
          className="min-h-[48px] bg-[var(--color-accent)]"
          onClick={async () => {
            await requestPermission();
            setCompassReady(true);
          }}
        >
          Enable Compass
        </Button>
      </div>
    );
  }

  const med = incident.hikerMedicalInfo || {};

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className="w-[280px] h-[280px] rounded-full border-4 border-[var(--color-accent)] flex items-center justify-center relative"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="absolute w-4 h-24 bg-[var(--color-accent)] rounded-full"
            style={{
              transform: `rotate(${arrowRotation}deg)`,
              transformOrigin: "center bottom",
              bottom: "50%",
            }}
          />
        </div>
        <p className="text-5xl font-bold text-[var(--color-accent)] mt-4">
          {distance != null ? `${distance}m` : hasValidHikerLocation ? "—" : "Location unavailable"}
        </p>
        <p className="text-xl mt-2">{incident.hikerName}</p>
        <p className="text-[var(--color-mid)]">{incident.type}</p>
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-sm text-[var(--color-accent)] underline"
          >
            Open in Maps
          </a>
        )}
      </div>

      <Card className="bg-[#1E293B] border-[#334155] mb-4">
        <CardContent className="pt-4">
          <p className="text-sm">
            <strong>Blood:</strong> {med.bloodType || "—"}
          </p>
          {med.conditions && <p className="text-sm">Conditions: {med.conditions}</p>}
          {med.allergies && <p className="text-sm">Allergies: {med.allergies}</p>}
        </CardContent>
      </Card>

      {incident.status === "active" && (
        <Button
          className="w-full min-h-[48px] mb-2 bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90"
          onClick={handleRespond}
          disabled={responding}
        >
          {responding ? "Responding..." : "I'm Responding"}
        </Button>
      )}
      {incident.status === "responding" && (
        <Button
          className="w-full min-h-[48px] bg-[var(--color-success)]"
          onClick={handleArrived}
          disabled={resolving}
        >
          {resolving ? "Closing..." : "Arrived — Close Incident"}
        </Button>
      )}
    </div>
  );
}
