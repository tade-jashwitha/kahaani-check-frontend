import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",

        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
          light: "var(--primary-light)",
        },

        status: {
          stable: "var(--status-stable)",
          "stable-bg": "var(--status-stable-bg)",
          review: "var(--status-review)",
          "review-bg": "var(--status-review-bg)",
          insufficient: "var(--status-insufficient)",
          "insufficient-bg": "var(--status-insufficient-bg)",
        },

        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },

      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
      },

      boxShadow: {
        card: "var(--shadow-card)",
      },

      fontFamily: {
        sans: ["var(--font-manrope)", "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;