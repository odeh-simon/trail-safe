import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EMERGENCY_CARD_KEY = "trailsafe_emergency_card";

export default function EmergencyCard() {
  const [searchParams] = useSearchParams();
  const hikerId = searchParams.get("hikerId");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hikerId) {
      getDoc(doc(db, "hikers", hikerId))
        .then((snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setData({
              name: d.name,
              medicalInfo: d.medicalInfo || {},
              emergencyContact: d.emergencyContact || {},
              hikeName: d.hikeName,
              hikeDate: d.hikeDate,
            });
          } else {
            setData(null);
          }
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false));
      return;
    }
    try {
      const raw = localStorage.getItem(EMERGENCY_CARD_KEY);
      if (raw) {
        setData(JSON.parse(raw));
      }
    } catch (err) {
      setData(null);
    }
    setLoading(false);
  }, [hikerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-6">
        <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-4">
          No Emergency Card
        </h1>
        <p className="text-[var(--color-mid)] text-center">
          {hikerId
            ? "Hiker not found or has no emergency info."
            : "Register as a hiker first to save your emergency information."}
        </p>
      </div>
    );
  }

  const med = data.medicalInfo || {};
  const ec = data.emergencyContact || {};

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-6 max-w-[430px] mx-auto">
      <h1 className="text-3xl font-bold text-[var(--color-danger)] mb-6 text-center">
        EMERGENCY CARD
      </h1>

      <div className="space-y-6 text-lg">
        <div>
          <p className="text-2xl font-bold text-[var(--color-dark)]">{data.name}</p>
        </div>

        <div>
          <p className="font-bold text-[var(--color-dark)]">Blood Type</p>
          <p className="text-[var(--color-dark)]">{med.bloodType || "—"}</p>
        </div>

        {med.conditions && (
          <div>
            <p className="font-bold text-[var(--color-dark)]">Medical Conditions</p>
            <p className="text-[var(--color-dark)]">{med.conditions}</p>
          </div>
        )}

        {med.medications && (
          <div>
            <p className="font-bold text-[var(--color-dark)]">Medications</p>
            <p className="text-[var(--color-dark)]">{med.medications}</p>
          </div>
        )}

        {med.allergies && (
          <div>
            <p className="font-bold text-[var(--color-dark)]">Allergies</p>
            <p className="text-[var(--color-dark)]">{med.allergies}</p>
          </div>
        )}

        <div>
          <p className="font-bold text-[var(--color-dark)]">Emergency Contact</p>
          <p className="text-[var(--color-dark)]">{ec.name || "—"}</p>
          <p className="text-[var(--color-dark)]">{ec.phone || "—"}</p>
          <p className="text-sm text-[var(--color-mid)]">{ec.relation || ""}</p>
        </div>

        <div>
          <p className="font-bold text-[var(--color-dark)]">Hike</p>
          <p className="text-[var(--color-dark)]">{data.hikeName || "—"}</p>
          <p className="text-sm text-[var(--color-mid)]">
            {data.hikeDate
              ? new Date(data.hikeDate).toLocaleDateString()
              : ""}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[var(--color-danger)]/10 border-2 border-[var(--color-danger)]">
          <p className="font-bold text-[var(--color-danger)] text-center">
            Show this screen to a Hike Leader
          </p>
        </div>
      </div>
    </div>
  );
}
