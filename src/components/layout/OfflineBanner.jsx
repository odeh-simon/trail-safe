import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="sticky top-0 left-0 right-0 z-50 py-2 px-4 text-center text-white bg-[var(--color-warning)] font-medium"
      role="alert"
    >
      Offline — changes will sync when signal returns
    </div>
  );
}
