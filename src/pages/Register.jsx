import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveHike } from "@/hooks/useActiveHike";
import { useHike } from "@/hooks/useHike";
import { registerHiker } from "@/lib/firestore";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EMERGENCY_CARD_KEY = "trailsafe_emergency_card";
const INVITE_HIKE_KEY = "trailsafe_invite_hikeId";

export default function Register() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const inviteHikeId = typeof window !== "undefined" ? sessionStorage.getItem(INVITE_HIKE_KEY) : null;
  const { data: hikeFromInvite, loading: inviteLoading, error: inviteError } = useHike(inviteHikeId || null);
  const { hike: activeHike, loading: activeLoading, error: activeError } = useActiveHike();

  const hike = inviteHikeId ? hikeFromInvite : activeHike;
  const hikeLoading = inviteHikeId ? inviteLoading : activeLoading;
  const hikeError = inviteHikeId ? inviteError : activeError;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!phone.trim()) e.phone = "Phone is required";
    if (!emergencyName.trim()) e.emergencyName = "Emergency contact name is required";
    if (!emergencyPhone.trim()) e.emergencyPhone = "Emergency contact phone is required";
    if (!emergencyRelation.trim()) e.emergencyRelation = "Relationship is required";
    if (!bloodType) e.bloodType = "Blood type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !user || !hike) return;

    setSubmitting(true);
    try {
      const hikerData = {
        userId: user.uid,
        hikeId: hike.id,
        groupId: hike.groups?.[0]?.id ?? null,
        name: name.trim(),
        phone: phone.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relation: emergencyRelation.trim(),
        },
        medicalInfo: {
          bloodType,
          conditions: conditions.trim(),
          medications: medications.trim(),
          allergies: allergies.trim(),
        },
      };

      const hikerId = await registerHiker(hikerData);
      if (!hikerId) throw new Error("Registration failed");

      const emergencyCard = {
        name: hikerData.name,
        medicalInfo: hikerData.medicalInfo,
        emergencyContact: hikerData.emergencyContact,
        hikeName: hike.name,
        hikeDate: hike.date?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        hikerId,
      };
      localStorage.setItem(EMERGENCY_CARD_KEY, JSON.stringify(emergencyCard));

      navigate("/hiker");
    } catch (err) {
      setErrors({ submit: err.message || "Registration failed" });
    } finally {
      setSubmitting(false);
    }
  };

  if (hikeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[var(--color-dark)]">Loading...</p>
      </div>
    );
  }

  if (hikeError || !hike) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-[var(--color-danger)]">
              {hikeError || "No upcoming or active hike found. Check back later."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hikeLoading && hike?.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="font-medium text-[var(--color-dark)]">Registration Closed</p>
            <p className="text-sm text-[var(--color-mid)]">
              This hike has ended. Registration is no longer available.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-dark)] mb-4">
        Hiker Registration
      </h1>
      <p className="text-[var(--color-mid)] mb-6">
        Registering for: {hike.name}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="mt-1 min-h-[48px]"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-[var(--color-danger)] mt-1" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27821234567"
                className="mt-1 min-h-[48px]"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-[var(--color-danger)] mt-1" role="alert">
                  {errors.phone}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="bloodType">Blood Type *</Label>
              <select
                id="bloodType"
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[48px] mt-1"
                aria-invalid={!!errors.bloodType}
              >
                <option value="">Select blood type</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
              {errors.bloodType && (
                <p className="text-sm text-[var(--color-danger)] mt-1" role="alert">
                  {errors.bloodType}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="conditions">Medical Conditions (optional)</Label>
              <Input
                id="conditions"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g. diabetic"
                className="mt-1 min-h-[48px]"
              />
            </div>
            <div>
              <Label htmlFor="medications">Medications (optional)</Label>
              <Input
                id="medications"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="e.g. insulin"
                className="mt-1 min-h-[48px]"
              />
            </div>
            <div>
              <Label htmlFor="allergies">Allergies (optional)</Label>
              <Input
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. penicillin"
                className="mt-1 min-h-[48px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emergencyName">Contact Name *</Label>
              <Input
                id="emergencyName"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1 min-h-[48px]"
                aria-invalid={!!errors.emergencyName}
              />
              {errors.emergencyName && (
                <p className="text-sm text-[var(--color-danger)] mt-1" role="alert">
                  {errors.emergencyName}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="emergencyPhone">Contact Phone *</Label>
              <Input
                id="emergencyPhone"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+27829876543"
                className="mt-1 min-h-[48px]"
                aria-invalid={!!errors.emergencyPhone}
              />
              {errors.emergencyPhone && (
                <p className="text-sm text-[var(--color-danger)] mt-1" role="alert">
                  {errors.emergencyPhone}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="emergencyRelation">Relationship *</Label>
              <Input
                id="emergencyRelation"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="e.g. spouse"
                className="mt-1 min-h-[48px]"
                aria-invalid={!!errors.emergencyRelation}
              />
              {errors.emergencyRelation && (
                <p className="text-sm text-[var(--color-danger)] mt-1" role="alert">
                  {errors.emergencyRelation}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>

        {errors.submit && (
          <p className="text-sm text-[var(--color-danger)]" role="alert">
            {errors.submit}
          </p>
        )}

        <Button
          type="submit"
          className="w-full min-h-[48px]"
          size="lg"
          disabled={submitting}
        >
          {submitting ? "Registering..." : "Register"}
        </Button>
      </form>
    </div>
  );
}
