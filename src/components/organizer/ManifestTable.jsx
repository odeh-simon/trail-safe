import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

/**
 * Hiker manifest table with status indicators
 * @param {{ hikers: Array; hike: object|null; overdueThresholdMinutes?: number }}
 */
export default function ManifestTable({
  hikers,
  hike,
  overdueThresholdMinutes = 30,
}) {
  const hikeEndTime = hike?.date?.toMillis
    ? hike.date.toMillis() + (hike.expectedDuration || 180) * 60 * 1000
    : null;
  const now = Date.now();

  const getStatusBadge = (h) => {
    if (h.checkedOut) {
      return <Badge variant="secondary">Out</Badge>;
    }
    if (h.checkedIn) {
      // Fix BUG-09: Overdue = 30 min after expected end, regardless of End Hike
      const isOverdue =
        hikeEndTime &&
        now > hikeEndTime + overdueThresholdMinutes * 60 * 1000;
      if (isOverdue) {
        return (
          <Badge className="bg-[var(--color-warning)] text-black">Overdue</Badge>
        );
      }
      return <Badge className="bg-[var(--color-success)] text-white">In</Badge>;
    }
    return <Badge variant="destructive">Not In</Badge>;
  };

  if (!hikers?.length) {
    return (
      <p className="text-[var(--color-mid)] py-4 text-center">
        No hikers registered yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2">Name</th>
            <th className="text-left py-2 px-2">Group</th>
            <th className="text-left py-2 px-2">Status</th>
            <th className="text-left py-2 px-2">Check In</th>
            <th className="text-left py-2 px-2">Blood</th>
            <th className="text-left py-2 px-2">Card</th>
          </tr>
        </thead>
        <tbody>
          {hikers.map((h) => (
            <tr key={h.id} className="border-b">
              <td className="py-2 px-2 font-medium">{h.name}</td>
              <td className="py-2 px-2">
                {hike?.groups?.find((g) => g.id === h.groupId)?.name || h.groupId || "—"}
              </td>
              <td className="py-2 px-2">{getStatusBadge(h)}</td>
              <td className="py-2 px-2 text-xs">
                {h.checkedInAt?.toDate?.()
                  ? h.checkedInAt.toDate().toLocaleTimeString()
                  : "—"}
              </td>
              <td className="py-2 px-2">{h.medicalInfo?.bloodType || "—"}</td>
              <td className="py-2 px-2">
                <Link to={`/emergency-card?hikerId=${h.id}`} className="text-[var(--color-accent)] text-xs underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
