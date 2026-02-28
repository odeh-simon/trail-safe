import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { useHike } from "@/hooks/useHike";
import { useLeaderProfile } from "@/hooks/useLeaderProfile";
import { setUserProfile, joinAsLeader } from "@/lib/firestore";

export default function JoinAsLeader() {
  const { hikeId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, setRole } = useAuthStore();
  const { data: hike, loading: hikeLoading, error: hikeError } = useHike(hikeId || null);
  const { leader, loading: leaderLoading } = useLeaderProfile(user?.uid, hikeId || null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!authLoading && !leaderLoading && leader) {
      navigate("/leader", { replace: true });
    }
  }, [authLoading, leaderLoading, leader, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !hikeId || !name.trim() || !phone.trim() || !roleTitle.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await setUserProfile(user.uid, { role: "leader" });
      setRole("leader");
      const leaderId = await joinAsLeader(hikeId, user.uid, name.trim(), phone.trim(), roleTitle.trim());
      if (!leaderId) throw new Error("Failed to join as leader");
      navigate("/leader", { replace: true });
    } catch (err) {
      setSubmitError(err.message || "Failed to join");
    } finally {
      setSubmitting(false);
    }
  };

  const loading = authLoading || hikeLoading;
  const hikeEnded = !hikeLoading && hike && hike.status === "ended";
  const invalidHike = !hikeLoading && (hikeError || !hike || hikeEnded);

  if (loading && !leader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[var(--color-dark)]">Loading...</p>
      </div>
    );
  }

  if (invalidHike) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-[var(--color-danger)]">
              This invite link is no longer valid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 max-w-[430px] mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Join as Leader</CardTitle>
          <p className="text-sm text-[var(--color-mid)] mt-1">
            You have been invited to join {hike?.name} as a Leader
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 min-h-[48px]"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27..."
                className="mt-1 min-h-[48px]"
                required
              />
            </div>
            <div>
              <Label htmlFor="roleTitle">Role / Title *</Label>
              <Input
                id="roleTitle"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="First Aid, Group Lead, Sweep..."
                className="mt-1 min-h-[48px]"
                required
              />
            </div>
            {submitError && (
              <p className="text-sm text-[var(--color-danger)]">{submitError}</p>
            )}
            <Button
              type="submit"
              className="w-full min-h-[48px]"
              disabled={submitting}
            >
              {submitting ? "Joining..." : "Join as Leader"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
