// CareerOps mark: three rising bars (the board's kanban columns, climbing).
// Theme-aware — the tile uses the primary token and inverts in dark mode.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden role="img">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="7.8" y="16" width="4.3" height="8" rx="2.15" className="fill-primary-foreground" />
      <rect x="13.85" y="11.5" width="4.3" height="12.5" rx="2.15" className="fill-primary-foreground" />
      <rect x="19.9" y="7" width="4.3" height="17" rx="2.15" className="fill-primary-foreground" />
    </svg>
  );
}
