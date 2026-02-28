import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fireSOSIncident, getActiveLeaders } from "@/lib/firestore";
import { useGeolocation } from "@/hooks/useGeolocation";

const SOS_TYPES = [
  { id: "medical", label: "Medical" },
  { id: "injury", label: "Injury" },
  { id: "lost", label: "Lost" },
  { id: "danger", label: "Danger" },
];

/**
 * SOS modal - emergency type selector, note, send
 * @param {{ open: boolean; onClose: () => void; hike: object; hiker: object; onSent: () => void; onQueued: () => void; isOnline: boolean }}
 */
export default function SOSModal({
  open,
  onClose,
  hike,
  hiker,
  onSent,
  onQueued,
  isOnline = true,
}) {
  const [type, setType] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const { lat, lng, accuracy, loading: gpsLoading, error: gpsError } = useGeolocation();
  const hasValidGps = lat != null && lng != null && (lat !== 0 || lng !== 0);

  const handleSend = async () => {
    if (!type || !hike || !hiker || !hasValidGps) return;

    setSending(true);
    try {
      const leaders = isOnline ? await getActiveLeaders(hike.id) : [];
      const incidentId = await fireSOSIncident({
        hikeId: hike.id,
        hiker: {
          id: hiker.id,
          userId: hiker.userId,
          name: hiker.name,
          medicalInfo: hiker.medicalInfo || {},
        },
        type,
        note: note.trim(),
        location: { lat, lng },
        leaders,
      });

      if (!isOnline || !incidentId) {
        onQueued();
      } else {
        onSent(incidentId);
      }
      onClose();
    } catch (err) {
      onQueued();
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[430px] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-danger)]">SOS Emergency</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Emergency Type</p>
            <div className="grid grid-cols-2 gap-2">
              {SOS_TYPES.map((t) => (
                <Button
                  key={t.id}
                  variant={type === t.id ? "destructive" : "outline"}
                  className="min-h-[48px]"
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the situation..."
              className="w-full mt-1 min-h-[80px] rounded-md border border-input px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          {gpsLoading && (
            <p className="text-sm text-[var(--color-warning)]">Acquiring GPS location...</p>
          )}
          {gpsError && (
            <p className="text-sm text-[var(--color-danger)]">GPS unavailable: {gpsError}</p>
          )}
          {accuracy != null && hasValidGps && (
            <p className="text-sm text-[var(--color-mid)]">GPS: ±{Math.round(accuracy)}m</p>
          )}
          <Button
            variant="destructive"
            className="w-full min-h-[64px] text-lg font-bold bg-[var(--color-danger)] hover:bg-[var(--color-danger-dark)]"
            onClick={handleSend}
            disabled={!type || sending || !hasValidGps}
          >
            {sending ? "Sending..." : !hasValidGps ? "Waiting for GPS..." : "SEND SOS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
