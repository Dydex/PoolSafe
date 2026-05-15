import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "../Figma Design/**/*.{html,md}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#f9f9ff",
        "surface-container-low": "#f0f3ff",
        "secondary-fixed": "#6ffbbe",
        "on-primary-fixed-variant": "#0b513d",
        "outline-variant": "#bfc9c3",
        "on-tertiary-fixed-variant": "#6e372f",
        "secondary-fixed-dim": "#4edea3",
        "on-secondary-container": "#00714d",
        "on-primary-fixed": "#002117",
        "on-secondary-fixed-variant": "#005236",
        "surface-container-high": "#e2e8f8",
        "primary-fixed": "#b0f0d6",
        "on-background": "#151c27",
        "on-surface": "#151c27",
        "on-primary-container": "#80bea6",
        "tertiary-fixed-dim": "#ffb4a9",
        "surface-variant": "#dce2f3",
        "secondary-container": "#6cf8bb",
        "surface-bright": "#f9f9ff",
        "on-surface-variant": "#404944",
        "surface-tint": "#2b6954",
        "error-container": "#ffdad6",
        "tertiary-container": "#6b342d",
        "surface-container": "#e7eefe",
        "on-tertiary-fixed": "#380d08",
        surface: "#f9f9ff",
        tertiary: "#4f1f19",
        "surface-container-highest": "#dce2f3",
        secondary: "#006c49",
        "on-error": "#ffffff",
        "on-primary": "#ffffff",
        "on-secondary-fixed": "#002113",
        "on-tertiary-container": "#ea9e93",
        "on-error-container": "#93000a",
        outline: "#707974",
        "surface-container-lowest": "#ffffff",
        "primary-container": "#064e3b",
        "inverse-surface": "#2a313d",
        "on-tertiary": "#ffffff",
        "tertiary-fixed": "#ffdad5",
        "inverse-primary": "#95d3ba",
        "on-secondary": "#ffffff",
        "inverse-on-surface": "#ebf1ff",
        error: "#ba1a1a",
        primary: "#003527",
        "primary-fixed-dim": "#95d3ba",
        "surface-dim": "#d3daea"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        base: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        gutter: "20px",
        lg: "24px",
        xl: "32px",
        "container-padding": "40px"
      },
      fontFamily: {
        "display-lg": ["Inter", "sans-serif"],
        "mono-data": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "mono-data": ["14px", { lineHeight: "1.4", fontWeight: "500" }],
        "headline-sm": ["18px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }]
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

export default config;
