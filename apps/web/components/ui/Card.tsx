import type { HTMLAttributes, ReactNode } from "react";
import { cls, cx } from "@/lib/cx";

const BASE = cls("relative border-2 border-ink rounded bg-paper-hi shadow-hard", "p-4");
const CAPTION = "mt-3 font-mono text-xs uppercase tracking-wider text-ink";

/** Small L-shaped crop marks at one corner. */
function Mark({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const pos: Record<typeof position, string> = {
    tl: "-top-3 -left-3",
    tr: "-top-3 -right-3 rotate-90",
    br: "-bottom-3 -right-3 rotate-180",
    bl: "-bottom-3 -left-3 -rotate-90",
  };
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={cx("pointer-events-none absolute text-ink", pos[position])}
    >
      <path d="M12 6H6V12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  cropMarks?: boolean;
  /** -1deg rotation, desktop only. */
  tilt?: boolean;
  /** Mono caption, e.g. "TEMPLATE № 02". */
  caption?: string;
  children?: ReactNode;
}

export function Card({ cropMarks = false, tilt = false, caption, className, children, ...rest }: CardProps) {
  return (
    <div className={cx(BASE, tilt && "md:-rotate-1", className)} {...rest}>
      {cropMarks ? (
        <>
          <Mark position="tl" />
          <Mark position="tr" />
          <Mark position="bl" />
          <Mark position="br" />
        </>
      ) : null}
      {children}
      {caption ? <p className={CAPTION}>{caption}</p> : null}
    </div>
  );
}
