import type { ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { cls, cx } from "@/lib/cx";

const WRAP = "flex flex-col gap-1.5";
const LABEL = "font-body text-base font-semibold text-ink";
const HELPER = "font-body text-sm text-ink";
const ERROR_TEXT = cls("flex items-start gap-1.5", "font-body text-sm font-semibold text-press-red-deep");
const BAR_ERROR = "border-l-2 border-press-red pl-3";

export interface FieldShellProps {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}

/** Always-visible label above the control, helper and error text below. */
export function FieldShell({ id, label, helper, error, children }: FieldShellProps) {
  return (
    <div className={WRAP}>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <div className={cx(error ? BAR_ERROR : "border-l-2 border-transparent pl-3")}>{children}</div>
      {helper && !error ? (
        <p id={`${id}-help`} className={HELPER}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} role="alert" className={ERROR_TEXT}>
          <WarningCircle weight="bold" size={18} aria-hidden="true" className="mt-1 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export const CONTROL = cls(
  "w-full min-h-12 border-2 border-ink rounded bg-paper-hi px-3 py-2",
  "font-body text-ink"
);

/** Bangla inputs: 18px / 1.65 line height. */
export const BANGLA_CONTROL = "text-[18px] leading-[1.65]";
