/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-app)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        accent: 'var(--accent-primary)',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      // Extend standard colors for compatibility with hex classes if needed
    },
  },
  plugins: [],
}
