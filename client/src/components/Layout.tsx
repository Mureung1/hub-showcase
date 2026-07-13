import { Outlet, useMatches, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import './Layout.css'

type RouteHandle = { title?: string }

function Layout() {
  const navigate = useNavigate()
  const matches = useMatches()
  const title = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .reverse()
    .find((t): t is string => Boolean(t))

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
