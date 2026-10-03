import { Check } from "@phosphor-icons/react/dist/ssr";
import { cls, cx } from "@/lib/cx";

const STATION = cls(
  "relative z-10 flex h-10 w-10 items-center justify-center",
  "rounded-full border-2 border-ink font-mono text-sm"
);

export interface StepperProps {
  steps: string[];
  /** Zero-based index of the active station. */
  current: number;
}

/** Press-run stepper: stations on a ruled line. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="relative flex items-start justify-between" aria-label="ধাপ">
      <span aria-hidden="true" className="absolute left-5 right-5 top-5 h-0 border-t-2 border-ink" />
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex flex-1 flex-col items-center gap-2 text-center"
          >
            <span className={cx(STATION, active ? "bg-mustard text-ink" : "bg-paper-hi text-ink")}>
              {done ? <Check weight="bold" size={20} aria-label="সম্পন্ন" /> : i + 1}
            </span>
            <span className={cx("font-body text-sm", active ? "font-bold" : "font-medium")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
