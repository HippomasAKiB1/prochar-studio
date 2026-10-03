import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cls, cx } from "@/lib/cx";
import { FOCUS_RING, INTERACTIVE, PRESS } from "./styles";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "destructive";
export type ButtonSize = "md" | "lg";

const BASE = cls(
  "inline-flex items-center justify-center gap-2",
  "font-body font-bold select-none",
  "disabled:opacity-60 disabled:pointer-events-none"
);

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-press-red text-paper-hi",
  secondary: "bg-paper-hi text-ink",
  destructive: "bg-paper-hi text-press-red-deep",
};

const SIZE: Record<ButtonSize, string> = {
  md: "px-5 text-base",
  lg: "px-7 text-lg min-h-14",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, INTERACTIVE, PRESS, FOCUS_RING, VARIANT[variant], SIZE[size], className)}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});
