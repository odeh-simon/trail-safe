/**
 * Reusable empty state for lists/tables
 * @param {{ icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }}
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      {icon && <div className="text-[var(--color-mid)] mb-3">{icon}</div>}
      <p className="font-medium text-[var(--color-dark)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-mid)] mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
