/**
 * SmartFF Agent Tailwind Configuration
 * GS 브랜드 컬러와 기본 설정 확장
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#0067C5',
        accent: '#F58220',
        success: '#6BBE45',
        bg: '#F8FAFC',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'base': '0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
        'md': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  safelist: [
    'bg-success/10',
    'text-success',
    'bg-accent/10',
    'text-accent',
    'bg-slate-100',
    'text-slate-600',
  ],
};
