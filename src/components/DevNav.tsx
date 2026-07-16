import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/', label: '홈' },
  { to: '/intro', label: '기획서' },
  { to: '/record', label: '기록' },
  { to: '/calendar', label: '캘린더' },
  { to: '/rooms', label: '친구 방' },
  { to: '/settings', label: '설정' },
]

function DevNav() {
  return (
    <nav className="flex justify-center gap-4 border-b border-border bg-card px-4 py-3 text-sm">
      {LINKS.map((link) => (
        <Link className="text-muted hover:text-heading" key={link.to} to={link.to}>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

export default DevNav
