/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F0F4F8', // 연한 파스텔 블루 배경
        surface: '#FFFFFF',    // 하얀색 블록(박스)
        primary: '#4A90E2',    // 포인트 블루
        secondary: '#FFB6C1',  // 포인트 핑크
        textMain: '#2D3748',   // 진한 텍스트
        textMuted: '#718096',
        borderLine: '#E2E8F0'  // 부드러운 테두리
      },
      borderRadius: {
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'block': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
