import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import BottomTabBar from './BottomTabBar.jsx'
import { navDirection } from '../lib/useTabTransition.js'
import { colors, layout } from '../styles/theme.js'

const TAB_BAR_CLEARANCE = 76 // 탭바(고정 위치)에 콘텐츠 마지막 줄이 가리지 않도록 확보하는 하단 여백

// 탭별 스크롤 위치를 기억해 되돌아왔을 때 복원한다(PRD v2.0 §4의 "탭 전환 시 각 탭의 스크롤 위치가
// 유지되는지 확인하고, 깨진다면 유지되도록 처리"). 라우트가 통째로 언마운트/마운트되는 구조라
// 브라우저 기본 스크롤 복원이 동작하지 않으므로 직접 관리한다.
// 모듈 스코프에 두는 이유: AppShell 자체가 라우트마다 새로 마운트되므로 컴포넌트 상태로는 남지 않는다.
const scrollByPath = new Map()
let lastPathname = null

export default function AppShell({ children, hideTabBar = false }) {
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  // 슬라이드 방향을 <html data-nav-direction>에 반영한다. useTabTransition이 탭바 클릭 시 미리
  // 세팅하지만(View Transitions 스냅샷 전에 값이 있어야 하므로), 탭바를 거치지 않는 이동
  // (화면 안의 Link, 뒤로가기 등)에서는 여기서 다시 계산해 덮어쓴다 — 이 처리가 없으면 직전 탭
  // 전환의 방향값이 남아, /analyze -> /result 같은 같은-탭 이동에도 엉뚱한 슬라이드가 붙는다.
  useEffect(() => {
    const direction = lastPathname ? navDirection(lastPathname, pathname) : null
    document.documentElement.setAttribute('data-nav-direction', direction ?? 'none')
    lastPathname = pathname
  }, [pathname])

  useEffect(() => {
    // 이 화면에 들어올 때: 기억해둔 위치로 복원(처음 방문이면 맨 위).
    // View Transitions가 진행 중일 수 있어 즉시(behavior 기본값 auto)로 옮긴다 — 부드럽게 스크롤하면
    // 전환 애니메이션과 겹쳐 화면이 두 번 움직이는 것처럼 보인다.
    window.scrollTo(0, scrollByPath.get(pathname) ?? 0)

    const remember = () => scrollByPath.set(pathRef.current, window.scrollY)
    // passive: 스크롤 성능에 영향을 주지 않게(이 핸들러는 preventDefault를 하지 않는다).
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      remember() // 떠나기 직전 마지막 위치를 한 번 더 저장
      window.removeEventListener('scroll', remember)
    }
  }, [pathname])

  return (
    <div style={{ background: colors.bg, minHeight: '100svh' }}>
      {/* .tds-screen: View Transitions를 지원하지 않는 브라우저에서 들어오는 화면만 방향대로
          슬라이드-인 시키는 폴백 훅(index.css). 지원 브라우저에서는 브라우저가 전환을 그리므로
          이 애니메이션은 사실상 겹쳐 보이지 않는다. key를 경로로 주어 탭이 바뀔 때마다 재생된다. */}
      <div
        key={pathname}
        className="tds-screen"
        style={{
          maxWidth: layout.shellMaxWidth,
          margin: '0 auto',
          paddingBottom: hideTabBar ? 0 : TAB_BAR_CLEARANCE,
        }}
      >
        {children}
      </div>
      {!hideTabBar && <BottomTabBar />}
    </div>
  )
}
