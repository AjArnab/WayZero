// =============================================================================
// TAILWIND CONFIG — WayZero design tokens
// -----------------------------------------------------------------------------
// WHAT THIS FILE DOES
//   Defines the visual language for the whole platform. Everything else
//   (components) pulls color/type from here so the palette only needs to be
//   tuned in one place.
//
// TOKEN RATIONALE
//   base/panel/line   -> a warm near-black graphite, not the generic cool
//                         navy-slate every AI-generated dark dashboard
//                         defaults to — grounded in asphalt under sodium
//                         streetlight, since this is literally a night
//                         road-monitoring room.
//   signal.*          -> deliberately traffic-signal-restrained: severity
//                         maps to real red/amber/green, not an arbitrary
//                         rainbow of neon accents. `live` and `anpr` are the
//                         two non-severity roles (active GPS, law
//                         enforcement) and are kept visually distinct from
//                         both severity and each other.
//   Route line colors are a SEPARATE muted palette (defined in
//   lib/roads.ts's ROUTE_COLORS), not reused from signal.* — a route's
//   color means "which line," a severity color means "how bad," and
//   overlapping the two on the map would be confusing.
//   mono / display    -> `mono` (IBM Plex Mono) reserved for genuinely
//                         technical readouts (device IDs, coordinates,
//                         plate numbers, raw scores) — used sparingly, not
//                         as the default UI font. `display` (IBM Plex Sans)
//                         is everything else: headings, labels, buttons,
//                         body copy.
// =============================================================================
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0B0A08", // page background — warm asphalt-dark
        panel: "#171310", // card / panel surface
        panel2: "#201B15", // raised surface (hover, headers)
        line: "#2E2820", // hairline borders
        ink: {
          DEFAULT: "#F2EDE4", // primary text — warm off-white
          muted: "#A69A87", // secondary text / captions
          faint: "#6B6152", // disabled / placeholder
        },
        signal: {
          critical: "#DC3A2E", // hit-and-run, accidents — stop-light red
          high: "#E8A23D", // waterlogging, major potholes — road-sign amber
          medium: "#D9B24C", // minor infra faults — muted gold
          low: "#4F9E6E", // informational / resolved — go-light green
          live: "#4C8FD1", // active bus / live stream — GPS-marker blue
          anpr: "#8B6FBF", // law-enforcement / ANPR specific — muted violet
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px #2E2820, 0 12px 32px -12px rgba(0,0,0,0.6)",
        glow: "0 0 24px -4px currentColor",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "0.8" },
          "80%": { transform: "scale(2.2)", opacity: "0" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)", opacity: "0.9" },
          "100%": { transform: "rotate(360deg)", opacity: "0.9" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        "radar-sweep": "radar-sweep 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
