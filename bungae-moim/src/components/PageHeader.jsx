import { useNavigate } from 'react-router-dom'

export default function PageHeader({ title, eyebrow, back }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
      {back && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="pill-btn pill-btn--ghost pill-btn--sm"
          style={{ padding: '8px 12px' }}
        >
          ←
        </button>
      )}
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="section-title">{title}</h1>
      </div>
    </div>
  )
}
