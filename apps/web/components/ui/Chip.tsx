import type { ButtonHTMLAttributes } from "react";
import { cls, cx } from "@/lib/cx";
import { FOCUS_RING } from "./styles";

const BASE = cls(
  "inline-flex items-center justify-center min-h-12 px-5",
  "rounded-full border-2 border-ink font-body font-semibold",
  "transition-colors duration-[80ms]"
);

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(BASE, FOCUS_RING, selected ? "bg-ink text-paper" : "bg-paper-hi text-ink", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
