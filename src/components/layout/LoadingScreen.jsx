export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
      <div
        className="w-12 h-12 rounded-full border-4 border-[var(--color-primary)] border-t-transparent animate-spin mb-4"
        aria-hidden
      />
      <p className="text-[var(--color-mid)]">{message}</p>
    </div>
  );
}
