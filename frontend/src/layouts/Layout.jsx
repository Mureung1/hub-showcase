import { Outlet } from 'react-router-dom';
import './Layout.css'

const Layout = () => {
  return (
    <div className="app-layout">
      <header className="gnb">
        <span className="gnb-logo">SUBZIP</span>
      </header>

      <main className="frame-body">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout