import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0E1218", 2: "#171C25", 3: "#232A36", 4: "#343D4C" },
        paper: "#F3F4F6",
        line: "#E2E5EA",
        mute: "#5E6977",
        signal: { DEFAULT: "#2A4BFF", soft: "#E8ECFF", ink: "#1733C8" },
        ok: "#12805C",
        warn: "#B45309",
        bad: "#C62828",
      },
      fontFamily: {
        sans: ['"Barlow"', "system-ui", "sans-serif"],
        cond: ['"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(14,18,24,0.04), 0 1px 3px rgba(14,18,24,0.06)",
        pop: "0 12px 40px rgba(14,18,24,0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
