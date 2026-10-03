import { cls } from "@/lib/cx";

/** Shared class fragments for interactive elements. Colours are token names only. */

/** 3px mustard ring with a 2px ink offset. */
export const FOCUS_RING = cls(
  "focus-visible:outline-none",
  "focus-visible:ring-[3px] focus-visible:ring-mustard",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
);

/** 2px ink border, 2px radius, hard offset shadow, 48px minimum height. */
export const INTERACTIVE = cls("min-h-12 border-2 border-ink rounded shadow-hard");

/** Press effect: shift 2px and drop the shadow on :active, 80ms. */
export const PRESS = cls(
  "transition-[transform,box-shadow] duration-[80ms]",
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
);
