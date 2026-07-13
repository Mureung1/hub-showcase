export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F4F7FE',
        surface: '#FFFFFF',
        primary: '#5D5FEF',
        textMain: '#151D48',
        textMuted: '#737791',
        borderLine: '#F1F3F9'
      },
      borderRadius: {
        '3xl': '24px',
        '2xl': '16px',
        'xl': '12px'
      },
      boxShadow: {
        'block': '0 4px 20px rgba(0,0,0,0.04)',
        'primary': '0 4px 10px rgba(93,95,239,0.3)'
      }
    }
  },
  plugins: []
};
