/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "radifax-green": "#5EB453",
        "radifax-green-dark": "#4CA23D",
        "radifax-green-tint": "#EAF6E8",
        "radifax-charcoal": "#323232",
        "radifax-muted": "#6E6E6E",
      },
      fontFamily: {
        serif: ["'Anthropic Serif'", "'Source Serif 4'", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};