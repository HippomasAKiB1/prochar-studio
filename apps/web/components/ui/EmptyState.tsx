import type { ReactNode } from "react";
import { cls } from "@/lib/cx";

const WRAP = cls(
  "halftone flex flex-col items-center gap-4 text-center",
  "border-2 border-ink rounded bg-paper-hi px-6 py-10"
);

/** Halftone background, one Bangla line, one action. */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className={WRAP}>
      <p className="font-display text-xl font-extrabold bg-paper-hi px-2">{message}</p>
      {action}
    </div>
  );
}
