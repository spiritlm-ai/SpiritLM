import type { Config } from "tailwindcss";

const config = {
  theme: {
    extend: {
      colors: {
        spirit: {
          canvas: "#080808",
          login: "#252525",
          header: "#050505",
          section: "#101010",
          surface: "#1b1b1b",
          "surface-hover": "#20201e",
          text: "#f3f2ee",
          muted: "#a5a5a1",
          quiet: "#777875",
          accent: "#ffe02e",
          "accent-soft": "#ffeb61",
          "accent-ink": "#14130a",
          border: "#30302e",
          "border-subtle": "#20201e",
          "border-strong": "#42423d",
          "button-text": "#d1d0ca",
          "code-bg": "#11110f",
          "code-border": "#2c2c29",
          "code-text": "#dddcd6",
          "code-file": "#666760",
          "code-label": "#9b9b94",
          purple: "#c9aaff",
          yellow: "#f6d96f",
          green: "#a9d79d",
          red: "#e66e60",
          amber: "#e7bd51",
          emerald: "#66b97a",
          gray: "#51514b",
          mark: "#14130e",
          "mark-border": "#27261c",
          "mark-inner": "#2e2b1c",
        },
      },
      fontFamily: {
        body: ["Figtree", "Arial", "sans-serif"],
        heading: ["Manrope", "Figtree", "Arial", "sans-serif"],
      },
    },
  },
} satisfies Config;

export default config;
