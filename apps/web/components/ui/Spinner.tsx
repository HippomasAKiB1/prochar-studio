export function Spinner({ label = "লোড হচ্ছে" }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent"
    />
  );
}
