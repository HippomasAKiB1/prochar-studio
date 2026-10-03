import { commonMessages } from "@/messages/bn";

export function Spinner({ label = commonMessages.loading }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent"
    />
  );
}
