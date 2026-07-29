import { jumpToSection } from '../hooks/sectionJump'

// 네 화면이 공유하는 오른쪽 목차.
//
// 링크는 `href="#..."` 를 유지하되 클릭은 `jumpToSection` 이 가로챈다. 히스토리에 목차
// 위치가 쌓이면 다음 화면에서 뒤로가기가 화면을 되돌리지 못한다.
//
// items 는 [id, label] 쌍의 배열이다.
function SectionNav({ label, items, active, ariaLabel }) {
  return (
    <aside className="floating-nav" aria-label={ariaLabel || `${label} 목차`}>
      <p className="floating-nav__label">{label}</p>
      {items.map(([id, text]) => (
        <a
          key={id}
          className={active === id ? 'is-current' : ''}
          href={`#${id}`}
          onClick={(event) => jumpToSection(event, id)}
        >
          <span className="dot"></span>{text}
        </a>
      ))}
    </aside>
  )
}

export default SectionNav
