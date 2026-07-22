import { useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { tabIndexOf } from './tabs.js'

// 탭 전환 슬라이드(PRD v2.0 FR-4.2). 탭 인덱스를 비교해 방향을 정하고, 그 방향을 <html>의
// data-nav-direction 속성으로 내보낸다 — 실제 애니메이션은 전부 index.css가 그 속성을 보고 그린다.
// (transform/opacity만 쓰고, 레이아웃 속성은 건드리지 않는다 — FR-4.3.)
//
// [두 갈래 구현]
//  1) View Transitions API(document.startViewTransition)를 지원하면 그걸 쓴다. 나가는 화면과 들어오는
//     화면을 브라우저가 스냅샷으로 잡아 합성해주므로, 우리가 이전 화면의 React 트리를 붙잡아 두거나
//     DOM을 복제할 필요가 없다 — "기존 화면은 좌측으로 소폭 밀리며 페이드"를 정확히, 그리고 컴포넌트를
//     두 번 마운트하는 부작용(효과 재실행, API 재호출) 없이 만들 수 있다.
//     안드로이드 웹뷰는 Chrome 111+(2023)부터 지원한다.
//  2) 미지원 브라우저는 들어오는 화면만 방향대로 슬라이드-인 시킨다(AppShell의 .tds-screen).
//     나가는 화면 연출만 빠질 뿐 방향성은 그대로 느껴지고, 전환이 끊기지도 않는다.
//
// [중복 클릭 무시] 전환이 진행 중일 때 들어온 탭 클릭은 그냥 버린다(FR-4.2: 애니메이션 큐 꼬임 방지).

const DIRECTION_ATTR = 'data-nav-direction'
// index.css의 전환 길이(280ms)와 맞춘다. 이 시간 동안 추가 탭 클릭을 무시한다.
export const TAB_TRANSITION_MS = 280

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function supportsViewTransition() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

// 'forward'(오른쪽 탭으로) | 'back'(왼쪽 탭으로) | null(방향을 정할 수 없음 — 애니메이션 생략)
export function navDirection(fromPath, toPath) {
  const from = tabIndexOf(fromPath)
  const to = tabIndexOf(toPath)
  if (from === -1 || to === -1 || from === to) return null
  return to > from ? 'forward' : 'back'
}

export function useTabTransition() {
  const navigate = useNavigate()
  const location = useLocation()
  // state가 아니라 ref인 이유: 이 값 때문에 리렌더가 일어나면 전환 중에 화면이 한 번 더 그려져 오히려
  // 프레임을 잡아먹는다. 클릭을 버릴지 말지만 판단하면 되므로 렌더와 무관한 값이다.
  const transitioningRef = useRef(false)

  return useCallback(
    (toPath) => {
      if (transitioningRef.current) return // 전환 중 중복 클릭 무시
      if (toPath === location.pathname) return

      const direction = navDirection(location.pathname, toPath)

      // 방향을 못 정하거나(탭 밖 경로) OS "동작 줄이기"가 켜져 있으면 슬라이드를 쓰지 않는다.
      // reduce-motion이어도 전환 자체를 없애지는 않는다 — index.css가 짧은 페이드로 대체한다.
      if (!direction || prefersReducedMotion() || !supportsViewTransition()) {
        document.documentElement.setAttribute(DIRECTION_ATTR, direction ?? 'none')
        navigate(toPath)
        return
      }

      transitioningRef.current = true
      document.documentElement.setAttribute(DIRECTION_ATTR, direction)

      // flushSync로 감싸야 startViewTransition의 콜백이 끝나는 시점에 새 화면이 DOM에 반영돼 있다
      // (React 18+의 기본 비동기 렌더링에서는 콜백이 끝나도 아직 안 그려져 있어 전환이 빈 화면으로 잡힌다).
      const transition = document.startViewTransition(() => {
        flushSync(() => navigate(toPath))
      })

      transition.finished.finally(() => {
        transitioningRef.current = false
      })
    },
    [navigate, location.pathname],
  )
}
