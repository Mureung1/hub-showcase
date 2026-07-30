import { Icon } from './icons/index.jsx'

// 아코디언 토글에 쓰는 화살표 아이콘. open일 때 180도 회전한다.
// (SVG 규약 자체는 icons/index.jsx의 Icon이 갖고 있다 — 여기선 회전만 얹는다.)
export default function ChevronIcon({ open }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.2s ease',
        flexShrink: 0,
      }}
    >
      <Icon size={20}>
        <polyline points="6 9 12 15 18 9" />
      </Icon>
    </span>
  )
}
