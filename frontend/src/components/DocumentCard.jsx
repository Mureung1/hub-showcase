import { Link } from 'react-router-dom'
import TagBadge from './TagBadge.jsx'
import './components.css'

function DocumentCard({ doc, isBest = false }) {
  return (
    <Link to={`/archive/${doc.id}`} className="rs-card rs-doc-card">
      {(isBest || doc.feedbackWanted) && (
        <div className="rs-doc-card-flags">
          {isBest && <TagBadge tone="gold">베스트</TagBadge>}
          {doc.feedbackWanted && <TagBadge tone="gold">피드백 요청 중</TagBadge>}
        </div>
      )}
      <h3 className="rs-doc-card-title">{doc.title}</h3>
      <p className="rs-doc-card-meta">
        {doc.author} · {doc.publishedAt}
      </p>
      <div className="rs-doc-card-tags">
        <TagBadge>{doc.gameTag}</TagBadge>
        <TagBadge>{doc.jobTag}</TagBadge>
        <TagBadge>{doc.systemTag}</TagBadge>
      </div>
      <p className="rs-doc-card-stats">
        좋아요 {doc.likes} · 북마크 {doc.bookmarks} · 섹션 {doc.sections.length}개
      </p>
    </Link>
  )
}

export default DocumentCard
