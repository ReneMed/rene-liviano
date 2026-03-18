import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        medical: {
          medication: "#86efac",
          diagnosis: "#6ee7b7",
          procedure: "#34d399",
          alert: "#fca5a5",
          recommendation: "#a7f3d0",
        },
        recorder: {
          peach: "#ffdab9",
          peachDark: "#e8c4a0",
        },
        rene: {
          aqua: "#f0fdfa",
          aquaDark: "#ccfbf1",
          green: "#14b8a6",
          greenDark: "#0d9488",
        },
      },
    },
  },
  plugins: [],
};
export default config;
