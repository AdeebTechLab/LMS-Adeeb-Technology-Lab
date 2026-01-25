/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          darkest: '#071310',
          dark: '#0D2818',
          DEFAULT: '#1A5D3A',
          light: '#22C55E',
          lighter: '#4ADE80',
        },
        accent: {
          gold: '#F4C430',
          teal: '#14B8A6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
