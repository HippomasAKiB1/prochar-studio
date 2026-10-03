import type { ReactNode } from "react";
import { cls, cx } from "@/lib/cx";

export type StampVariant = "ready" | "failed" | "working";

const BASE = cls(
  "inline-block -rotate-3 border-2 px-3 py-1",
  "font-display font-extrabold uppercase tracking-wide"
);

const VARIANT: Record<StampVariant, string> = {
  ready: "border-paddy text-paddy",
  failed: "border-press-red-deep text-press-red-deep",
  working: "border-mustard text-ink bg-mustard",
};

export function Stamp({ variant, children }: { variant: StampVariant; children: ReactNode }) {
  return <span className={cx(BASE, VARIANT[variant])}>{children}</span>;
}
