import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mist: "#DAD3CC",
        surface: "#F7F4EF",
        ink: "#0B1F28",
        muted: "#6D625C",
        faint: "#9B8E87",
        line: "#C4BAB3",
        pine: {
          DEFAULT: "#3B5F72",
          deep: "#102F3D",
          soft: "#DDE6EB",
          mid: "#4E7485"
        },
        amber: { DEFAULT: "#C7834B", soft: "#F5E8D8", dark: "#7A4E22" },
        clay:  { DEFAULT: "#B5483A", soft: "#F7E5E2", dark: "#7A2E24" },
        sea:   { DEFAULT: "#7E95A0", soft: "#E8EDF0", dark: "#4A6270" },
        sage:  { DEFAULT: "#8D9B6A", soft: "#EBF0E4", dark: "#5A6644" },
        food:  { DEFAULT: "#DAB692", soft: "#F7F0E8", dark: "#8B5E3C" }
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Spline Sans Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        card: "0 1px 3px rgba(11,31,40,0.06), 0 8px 24px rgba(11,31,40,0.08)",
        lift: "0 2px 6px rgba(11,31,40,0.08), 0 20px 48px rgba(11,31,40,0.14)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
export default config;
