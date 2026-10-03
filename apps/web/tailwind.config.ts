import type { Config } from "tailwindcss";

/**
 * All colour and font tokens map to CSS variables defined in app/globals.css.
 * Never hardcode hex values in this file.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-hi": "var(--paper-hi)",
        ink: "var(--ink)",
        "press-red": "var(--press-red)",
        "press-red-deep": "var(--press-red-deep)",
        paddy: "var(--paddy)",
        mustard: "var(--mustard)",
        "lime-wash": "var(--lime-wash)",
      },
      fontFamily: {
        display: ["var(--font-display-bn)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        "display-en": ["var(--font-display-en)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
        md: "2px",
        lg: "2px",
      },
      boxShadow: {
        hard: "3px 3px 0 var(--ink)",
      },
      maxWidth: {
        prose: "65ch",
      },
    },
  },
  plugins: [],
};

export default config;
