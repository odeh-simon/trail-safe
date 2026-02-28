/** @type {import("tailwindcss").Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
          light: "var(--color-primary-light)",
        },
        accent: { DEFAULT: "var(--color-accent)", dark: "var(--color-accent-dark)" },
        danger: { DEFAULT: "var(--color-danger)", dark: "var(--color-danger-dark)" },
        warning: "var(--color-warning)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
