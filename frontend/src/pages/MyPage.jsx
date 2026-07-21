import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DocumentCard from '../components/DocumentCard.jsx'
import {
  loadDrafts,
  deleteDraft,
  loadPublished,
  loadMyDrafts,
  loadMyPublished,
} from '../lib/storage.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './pages.css'

function MyPage() {
  const auth = useAuth()
  const [drafts, setDrafts] = useState([])
  const [published, setPublished] = useState([])

  // 로그인 상태면 내 문서만, 인증 미설정(프로토타입)이면 기존처럼 전체.
  const useMine = auth.isAuthEnabled && auth.isLoggedIn
  const fetchDrafts = useMine ? loadMyDrafts : loadDrafts
  const fetchPublished = useMine ? loadMyPublished : loadPublished

  useEffect(() => {
    if (auth.loading) return
    // 인증이 켜져 있는데 로그아웃 상태면 목록을 부르지 않는다(로그인 안내만 노출).
    if (auth.isAuthEnabled && !auth.isLoggedIn) {
      setDrafts([])
      setPublished([])
      return
    }
    Promise.all([fetchDrafts(), fetchPublished()])
      .then(([d, p]) => {
        setDrafts(d)
        setPublished(p)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.isLoggedIn])

  async function handleDelete(id) {
    await deleteDraft(id)
    setDrafts(await fetchDrafts())
  }

  if (auth.isAuthEnabled && !auth.loading && !auth.isLoggedIn) {
    return (
      <section>
        <header className="rs-page-head">
          <h1>마이페이지</h1>
          <p>로그인하면 내 계정에 저장된 기획서를 여기서 관리할 수 있어요.</p>
        </header>
        <div className="rs-panel rs-home-section">
          <p className="rs-empty">
            <Link to="/login">로그인</Link> 또는 <Link to="/signup">회원가입</Link> 후 이용해
            주세요.
          </p>
        </div>
      </section>
    )
  }

  const receivedComments = published.reduce((sum, d) => sum + (d.comments?.length ?? 0), 0)

  return (
    <section>
      <header className="rs-page-head">
        <h1>마이페이지</h1>
        <p>내 초안과 발행한 문서를 관리합니다.</p>
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
