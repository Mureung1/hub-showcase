// 하단 탭 정의 단일 소스. 탭바(BottomTabBar)가 그리는 데도 쓰고, 화면 전환 애니메이션이 "왼쪽 탭에서
// 오른쪽 탭으로 갔는지"를 판단하는 데도 쓴다 — 두 곳이 서로 다른 순서를 갖게 되면 슬라이드 방향이
// 반대로 나오므로 반드시 한 곳에서만 정의한다.
export const TABS = [
  { key: 'home', label: '홈', path: '/analyze', match: (p) => p.startsWith('/analyze') || p.startsWith('/result') },
  { key: 'meals', label: '식단', path: '/meals', match: (p) => p.startsWith('/meals') },
  { key: 'calendar', label: '달력', path: '/calendar', match: (p) => p.startsWith('/calendar') },
  { key: 'map', label: '지도', path: '/map', match: (p) => p.startsWith('/map') },
  { key: 'my', label: 'MY', path: '/profile', match: (p) => p.startsWith('/profile') },
]

// 탭에 속하지 않는 경로(/login, /signup 등)는 -1. 방향 계산 쪽에서 이 경우 애니메이션을 건너뛴다.
export function tabIndexOf(pathname) {
  return TABS.findIndex((tab) => tab.match(pathname))
}
