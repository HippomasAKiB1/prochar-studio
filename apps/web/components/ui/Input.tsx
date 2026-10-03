import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { FOCUS_RING } from "./styles";
import { FieldShell, CONTROL, BANGLA_CONTROL } from "./FieldShell";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
  helper?: string;
  error?: string;
  /** Bangla text field: sets lang="bn", 18px / 1.65. Omit for email/password. */
  bangla?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, bangla = false, id, className, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const describedBy = error ? `${fieldId}-err` : helper ? `${fieldId}-help` : undefined;
  return (
    <FieldShell id={fieldId} label={label} helper={helper} error={error}>
      <input
        ref={ref}
        id={fieldId}
        lang={bangla ? "bn" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL, bangla && BANGLA_CONTROL, FOCUS_RING, className)}
        {...rest}
      />
    </FieldShell>
  );
});
