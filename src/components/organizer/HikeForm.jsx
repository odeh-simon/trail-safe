import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createHike, createLeadersForHike } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

const DIFFICULTIES = ["easy", "moderate", "hard"];

/**
 * Form to create a new hike
 * @param {{ onCreated: (hikeId: string) => void }}
 */
export default function HikeForm({ onCreated }) {
  const { user } = useAuthStore();
  const [name, setName] = useState("");
  const [trail, setTrail] = useState("");
  const [date, setDate] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [expectedDuration, setExpectedDuration] = useState("180");
  const [difficulty, setDifficulty] = useState("moderate");
  const [groupCount, setGroupCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      const groups = Array.from({ length: Number(groupCount) || 1 }, (_, i) => ({
        id: `g${i + 1}`,
        name: `Group ${i + 1}`,
        leaderId: null,
        color: ["#16A34A", "#0EA5E9", "#F59E0B"][i % 3],
      }));

      const hikeData = {
        name: name.trim(),
        trail: trail.trim(),
        date: date ? new Date(date) : new Date(),
        meetingPoint: meetingPoint.trim(),
        meetingCoords: { lat: 0, lng: 0 },
        expectedDuration: Number(expectedDuration) || 180,
        difficulty,
        organizerId: user.uid,
        groups,
      };

      const hikeId = await createHike(hikeData);
      if (!hikeId) throw new Error("Failed to create hike");

      await createLeadersForHike(hikeId, groups, []);
      onCreated(hikeId);
    } catch (err) {
      setError(err.message || "Failed to create hike");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Hike</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Hike Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Saturday Hike #47"
              className="mt-1 min-h-[48px]"
              required
            />
          </div>
          <div>
            <Label htmlFor="trail">Trail</Label>
            <Input
              id="trail"
              value={trail}
              onChange={(e) => setTrail(e.target.value)}
              placeholder="Mountain Trail"
              className="mt-1 min-h-[48px]"
              required
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 min-h-[48px]"
              required
            />
          </div>
          <div>
            <Label htmlFor="meetingPoint">Meeting Point</Label>
            <Input
              id="meetingPoint"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="Trailhead parking"
              className="mt-1 min-h-[48px]"
            />
          </div>
          <div>
            <Label htmlFor="expectedDuration">Expected Duration (min)</Label>
            <Input
              id="expectedDuration"
              type="number"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
              min="60"
              className="mt-1 min-h-[48px]"
            />
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 mt-1 min-h-[48px]"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="groupCount">Number of Groups</Label>
            <Input
              id="groupCount"
              type="number"
              value={groupCount}
              onChange={(e) => setGroupCount(e.target.value)}
              min="1"
              max="10"
              className="mt-1 min-h-[48px]"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full min-h-[48px]" disabled={submitting}>
            {submitting ? "Creating..." : "Create Hike"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
