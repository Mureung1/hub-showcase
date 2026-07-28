// Letter&Co 정적 네비게이션 설정 — docs/design/Letter&Co Design System.zip 의 templates/shared/mockData.js 이식본.
// href: 템플릿의 .dc.html 상대 경로를 CLAUDE.md 라우트로 치환함.
// icon은 프론트 전용 값 — API에는 존재하지 않는다.
export const NAV_ITEMS = [
  { key: 'home', icon: 'flower', label: '그룹 홈', href: '/scr4/home' },
  { key: 'participants', icon: 'mailbox', label: '참가자 현황', href: '/scr0/status' },
  { key: 'coordinate', icon: 'vine', label: '조율', href: '/scr1/schedule' },
  { key: 'progress', icon: 'sprout', label: '진행', href: '/scr4/workspace' },
  { key: 'harvest', icon: 'postcard', label: '결산', href: '/scr5/review' },
  { key: 'settlement', icon: 'leaf', label: '정산', href: '/scr5/settlement' },
  { key: 'notifications', icon: 'envelope', label: '알림함', href: '/notifications' },
  { key: 'profile', icon: 'seed', label: '내 정보', href: '/profile' },
];
