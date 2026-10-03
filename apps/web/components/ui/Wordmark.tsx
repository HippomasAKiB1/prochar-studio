/** Registration crosshair: circle + cross. */
function Crosshair() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" className="shrink-0 text-press-red">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M11 0V22M0 11H22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Brand mark: "প্রচার" + registration crosshair + "STUDIO" (Archivo wide). */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-ink" aria-label="প্রচার স্টুডিও">
      <span aria-hidden="true" className="font-display text-2xl font-extrabold leading-none">
        প্রচার
      </span>
      <Crosshair />
      <span
        aria-hidden="true"
        className="font-display-en text-lg font-extrabold uppercase leading-none tracking-wide"
        style={{ fontVariationSettings: '"wdth" 125' }}
      >
        Studio
      </span>
    </span>
  );
}
