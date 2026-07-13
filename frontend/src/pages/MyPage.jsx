import { useState } from 'react'
import { Link } from 'react-router-dom'
import DocumentCard from '../components/DocumentCard.jsx'
import { loadDrafts, deleteDraft, loadPublished } from '../lib/storage.js'
import './pages.css'

function MyPage() {
  const [drafts, setDrafts] = useState(() => loadDrafts())
  const published = loadPublished()

  function handleDelete(id) {
    deleteDraft(id)
    setDrafts(loadDrafts())
  }

  const receivedComments = published.reduce((sum, d) => sum + (d.comments?.length ?? 0), 0)

  return (
    <section>
      <header className="rs-page-head">
        <h1>마이페이지</h1>
        <p>
          내 초안과 발행한 문서를 관리합니다. (프로토타입: 이 브라우저의 localStorage에만 저장돼요 —
          로그인·계정은 MVP에서 지원 예정)
        </p>
      </header>

      <div className="rs-panel rs-home-section">
        <h2>내 초안 ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="rs-empty">
            아직 초안이 없어요. <Link to="/write">첫 문서를 시작해 보세요.</Link>
          </p>
        ) : (
          drafts.map((draft) => (
            <div key={draft.id} className="rs-draft-row">
              <div>
                <p className="rs-draft-title">{draft.title || '(제목 없음)'}</p>
                <p className="rs-draft-meta">
                  {draft.gameTag || '게임 미지정'} · 섹션 {draft.sections.length}개 · 마지막 저장{' '}
                  {draft.updatedAt}
                </p>
              </div>
              <div className="rs-draft-actions">
                <Link
                  to={`/write/${draft.templateId}?draft=${draft.id}`}
                  className="rs-btn rs-btn-primary"
                >
                  이어 쓰기
                </Link>
                <button type="button" className="rs-btn" onClick={() => handleDelete(draft.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>발행한 문서 ({published.length})</h2>
          {receivedComments > 0 && <span>받은 피드백 {receivedComments}개</span>}
        </div>
        {published.length === 0 ? (
          <p className="rs-empty">발행한 문서가 여기에 표시됩니다.</p>
        ) : (
          <div className="rs-grid">
            {published.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default MyPage
