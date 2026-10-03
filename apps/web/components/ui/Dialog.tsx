"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cls } from "@/lib/cx";

const PANEL = cls(
  "m-0 mt-auto w-full max-w-none bg-paper-hi p-6 text-ink",
  "border-2 border-ink rounded shadow-hard",
  "md:m-auto md:max-w-md",
  "backdrop:bg-ink/50"
);

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Native <dialog>: showModal() gives a focus trap, inert background and Esc-to-close.
 * Centered on desktop, bottom sheet on mobile.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClose={onClose}
      className={PANEL}
    >
      <h2 id="dialog-title" className="mb-3 font-display text-2xl font-extrabold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
