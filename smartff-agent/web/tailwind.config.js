/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#4C6FE0',
        success: '#15803D',
        danger: '#DC2626',
        'bg-primary': '#F8FAFC',
        'bg-card': '#FFFFFF',
        'border-color': '#E2E8F0',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        sm: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        base: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        lg: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        '3xl': ['32px', { lineHeight: '40px', fontWeight: '700' }],
      },
      spacing: {
        'sidebar': '256px',
        'topbar': '64px',
      },
      maxWidth: {
        '7xl': '80rem',
      },
    },
  },
  plugins: [],
}
