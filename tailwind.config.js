/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./templates/**/*.html", "./static/js/**/*.js"],
  safelist: [
    "status-normal",
    "status-warning",
    "status-critical",
    "chip-green",
    "chip-amber",
    "chip-red",
    "normal",
    "warning",
    "critical",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
      },
      boxShadow: {
        panel: "0 12px 32px rgba(2, 6, 23, 0.55)",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".4", transform: "scale(1.35)" },
        },
      },
      animation: {
        sweep: "sweep 9s linear infinite",
        pulse: "pulse 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
