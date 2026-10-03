import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { FOCUS_RING } from "./styles";
import { FieldShell, CONTROL, BANGLA_CONTROL } from "./FieldShell";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> {
  label: string;
  helper?: string;
  error?: string;
  bangla?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, bangla = false, id, className, rows = 4, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? auto;
  const describedBy = error ? `${fieldId}-err` : helper ? `${fieldId}-help` : undefined;
  return (
    <FieldShell id={fieldId} label={label} helper={helper} error={error}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        lang={bangla ? "bn" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(CONTROL, bangla && BANGLA_CONTROL, FOCUS_RING, "resize-y", className)}
        {...rest}
      />
    </FieldShell>
  );
});
