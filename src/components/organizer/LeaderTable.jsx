import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  assignLeaderToGroup,
  autoAssignLeaders,
} from "@/lib/firestore";
import { toast } from "@/hooks/use-toast";

/**
 * Leader table with group assignment dropdown
 * @param {{ leaders: Array; hike: object|null; onAssign?: () => void }}
 */
export default function LeaderTable({
  leaders,
  hike,
  onAssign,
}) {
  const groups = hike?.groups || [];
  const [assigning, setAssigning] = useState(null);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const handleGroupChange = async (leaderId, newGroupId) => {
    setAssigning(leaderId);
    try {
      await assignLeaderToGroup(leaderId, newGroupId || null);
      toast({ title: "Leader assigned" });
      onAssign?.();
    } catch (err) {
      toast({ title: "Failed to assign", variant: "destructive" });
    } finally {
      setAssigning(null);
    }
  };

  const handleAutoAssign = async () => {
    if (!hike?.id) return;
    setAutoAssigning(true);
    try {
      await autoAssignLeaders(hike.id, groups);
      toast({ title: "Leaders auto-assigned" });
      onAssign?.();
    } catch (err) {
      toast({ title: "Auto-assign failed", variant: "destructive" });
    } finally {
      setAutoAssigning(false);
    }
  };

  if (!leaders?.length) {
    return (
      <p className="text-[var(--color-mid)] py-4 text-center">
        No leaders joined yet. Share the leader invite link.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-left py-2 px-2">Role</th>
              <th className="text-left py-2 px-2">Group</th>
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="py-2 px-2 font-medium">{l.name}</td>
                <td className="py-2 px-2">{l.roleTitle || "—"}</td>
                <td className="py-2 px-2">
                  <select
                    className="border rounded px-2 py-1 text-sm bg-[var(--color-bg)]"
                    value={l.groupId || ""}
                    onChange={(e) =>
                      handleGroupChange(l.id, e.target.value || null)
                    }
                    disabled={assigning === l.id}
                  >
                    <option value="">—</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <Badge
                    variant={
                      l.status === "responding"
                        ? "destructive"
                        : l.status === "available"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {l.status || "available"}
                  </Badge>
                </td>
                <td className="py-2 px-2 text-xs">
                  {l.lastLocation?.lat != null ? "GPS active" : "No location"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAutoAssign}
        disabled={autoAssigning}
      >
        {autoAssigning ? "Assigning..." : "Auto-Assign Unassigned Leaders"}
      </Button>
    </div>
  );
}
