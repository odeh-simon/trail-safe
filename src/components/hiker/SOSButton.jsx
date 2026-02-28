import { Button } from "@/components/ui/button";

/**
 * SOS emergency button - full width, danger red, min 80px height
 * @param {{ onPress: () => void; hikeStatus: string }}
 */
export default function SOSButton({ onPress, hikeStatus }) {
  const isDisabled = hikeStatus !== "active";

  return (
    <Button
      variant="destructive"
      className="w-full min-h-[80px] h-auto py-4 text-lg font-bold bg-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] animate-pulse"
      onClick={onPress}
      disabled={isDisabled}
      aria-label="SOS - Emergency"
    >
      SOS
    </Button>
  );
}
