import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        swamp: {
          50: "#F1F6F2",
          100: "#E1ECE3",
          200: "#C2D9C5",
          300: "#93BB99",
          400: "#6A9C73",
          500: "#4A7C59",
          600: "#3A6347",
          700: "#2E4F38",
          800: "#243D2C",
          900: "#1C2F22",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(17, 24, 39, 0.06), 0 1px 3px rgba(17, 24, 39, 0.05)",
        "card-hover":
          "0 14px 36px -12px rgba(74, 124, 89, 0.22), 0 6px 12px -4px rgba(17, 24, 39, 0.08)",
        "swamp-glow": "0 8px 24px -8px rgba(74, 124, 89, 0.35)",
      },
      backgroundImage: {
        "gradient-swamp": "linear-gradient(135deg, #4A7C59 0%, #3A6347 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(4px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "march": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "16px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-up-sm": "fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.15s ease-out both",
        "pop-in": "pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-down": "slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        "march": "march 0.6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
