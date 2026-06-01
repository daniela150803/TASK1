/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(222, 47%, 7%)",
        surface: "hsl(222, 47%, 11%)",
        "surface-2": "hsl(222, 47%, 15%)",
        border: "hsl(222, 30%, 20%)",
        accent: "hsl(199, 89%, 48%)",
        "accent-2": "hsl(142, 71%, 45%)",
        muted: "hsl(222, 20%, 60%)",
      },
    },
  },
  plugins: [],
};
