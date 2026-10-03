import { cx } from "@/lib/cx";

/** Diagonal hatch on lime-wash (SVG pattern, no gradient, no shimmer). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("skeleton-hatch rounded", className)} />;
}
