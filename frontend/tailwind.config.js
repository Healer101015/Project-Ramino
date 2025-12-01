/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        amino: {
          green: "#00D26A", // O Verde clássico do Amino
          dark: "#1C1E21",
          gray: "#F0F2F5",
          light: "#FFFFFF",
          text: "#333333",
          subtext: "#888888"
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'amino': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'amino-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}