/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1b23',
        surface: '#252631',
        primary: '#FF94A1', // Cute pastel pink
        secondary: '#A394FF', // Cute pastel purple
        textMain: '#ffffff',
        textMuted: '#9495a5'
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
