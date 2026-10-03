"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cls, cx } from "@/lib/cx";

export type ToastKind = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

const BAR: Record<ToastKind, string> = {
  success: "border-l-paddy",
  error: "border-l-press-red-deep",
  info: "border-l-mustard",
};

const ITEM = cls(
  "animate-slide-up pointer-events-auto",
  "border-2 border-ink border-l-8 rounded bg-paper-hi shadow-hard",
  "px-4 py-3 font-body font-semibold text-ink"
);

const VIEWPORT = cls(
  "pointer-events-none fixed inset-x-0 bottom-0 z-50",
  "flex flex-col items-center gap-3 p-4"
);

type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const toast = useCallback<ToastFn>((message, kind = "info") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className={VIEWPORT}>
        {items.map((t) => (
          <div key={t.id} className={cx(ITEM, BAR[t.kind])}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
