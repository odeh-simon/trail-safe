import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setUserProfile } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading, setRole } = useAuthStore();
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const handleOrganizerAccess = async () => {
    setPinError("");
    const expectedPin = import.meta.env.VITE_ORGANIZER_PIN ?? "1234";
    if (pin === String(expectedPin)) {
      if (user) {
        await setUserProfile(user.uid, { role: "organizer" });
        setRole("organizer");
        navigate("/organizer");
        setPin("");
        setPinOpen(false);
      }
    } else {
      setPinError("Incorrect PIN");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-dark)]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          Trail Safe
        </h1>
        <p className="text-white/90 text-lg mb-12">Hike together. Stay safe.</p>

        <div className="w-full max-w-sm space-y-4">
          <Button
            onClick={() => setPinOpen(true)}
            className="w-full h-14 rounded-lg text-lg bg-white text-[var(--color-primary-dark)] hover:bg-white/90 min-h-[48px]"
            size="lg"
          >
            Organizer Access
          </Button>
        </div>

        <p className="text-white/70 text-sm mt-12 text-center max-w-xs">
          Joining a hike? Use the link your organizer shared with you.
        </p>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Organizer PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="4-digit PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinError("");
                }}
                className="min-h-[48px] text-center text-lg"
                autoComplete="one-time-code"
              />
              {pinError && (
                <p className="text-sm text-[var(--color-danger)] mt-2">
                  {pinError}
                </p>
              )}
            </div>
            <Button
              className="w-full min-h-[48px]"
              onClick={handleOrganizerAccess}
              disabled={!pin || pin.length < 4}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
