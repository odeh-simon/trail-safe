/**
 * Responsive page shell.
 * Mobile: full width single column
 * Desktop: centered with max-width, optional sidebar
 */
export default function AppShell({ children, sidebar = null }) {
  if (sidebar) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            <aside className="hidden md:block w-64 flex-shrink-0">
              {sidebar}
            </aside>
            <main className="flex-1 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </div>
    </div>
  );
}
