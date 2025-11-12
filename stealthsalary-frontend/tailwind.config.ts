import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(59, 130, 246)", // blue-500
          light: "rgb(147, 197, 253)", // blue-300
          dark: "rgb(37, 99, 235)", // blue-600
        },
        accent: {
          DEFAULT: "rgb(6, 182, 212)", // cyan-500
          light: "rgb(103, 232, 249)", // cyan-300
          dark: "rgb(8, 145, 178)", // cyan-600
        },
        teal: {
          DEFAULT: "rgb(20, 184, 166)", // teal-500
          light: "rgb(94, 234, 212)", // teal-300
          dark: "rgb(15, 118, 110)", // teal-600
        },
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(31, 38, 135, 0.2)",
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        base: ["16px", { lineHeight: "1.25" }],
      },
    },
  },
  plugins: [],
} satisfies Config;


