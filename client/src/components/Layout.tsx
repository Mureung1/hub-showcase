import { Outlet, useMatches, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import './Layout.css'

type RouteHandle = { title?: string }  

function Layout() {
  const navigate = useNavigate() // study: 이벤트로 페이지 이동 가능하게 만드는 도구.
  const matches = useMatches() // study: 지나온 url들 담긴 matches 변수 생성.
  const title = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .reverse()
    .find((t): t is string => Boolean(t))  // study: 각 match에서 title만 가져옴.

    // study: title 3항 연산으로 결정 및 Outlet = 현재 url 화면 컴포넌트 위치
  return (
    <div className="layout">
      <header className="layout__header">
        {title ? (
          <>
            <button
              type="button"
              className="layout__back"
              onClick={() => navigate(-1)}
              aria-label="뒤로가기"
            >
              ‹
            </button>
            <span className="layout__title">{title}</span>
            <span className="layout__spacer" aria-hidden="true" />
          </>
        ) : (
          <img src={logo} alt="hub 로고" className="layout__logo" />
        )}
      </header>
      <main className="layout__content">
        <Outlet />  
      </main>
    </div>
  )
}

export default Layout
