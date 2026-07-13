import './components.css'

function TagBadge({ children, tone = 'default' }) {
  return <span className={`rs-tag rs-tag-${tone}`}>{children}</span>
}

export default TagBadge
