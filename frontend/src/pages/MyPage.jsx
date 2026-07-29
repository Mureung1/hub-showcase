import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DocumentCard from '../components/DocumentCard.jsx'
import AccountSettings from '../components/AccountSettings.jsx'
import { deleteDraft, loadMyDrafts, loadMyPublished } from '../lib/storage.js'
import { getLocalDocs, forgetLocalDoc } from '../lib/localDocs.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './pages.css'

function MyPage() {
  const auth = useAuth()
  const [drafts, setDrafts] = useState([])
  const [published, setPublished] = useState([])
  const [loadError, setLoadError] = useState(null)
  // 비회원이 이 브라우저에서 쓴 글(계정이 없어 서버로는 찾을 수 없다)
  const [localDocs, setLocalDocs] = useState([])

  useEffect(() => {
    setLocalDocs(getLocalDocs())
  }, [])

  useEffect(() => {
    if (auth.loading) return
    if (!auth.isLoggedIn) {
      setDrafts([])
      setPublished([])
      return
    }
    Promise.all([loadMyDrafts(), loadMyPublished()])
      .then(([d, p]) => {
        setDrafts(d)
        setPublished(p)
        setLoadError(null)
      })
      .catch((err) => setLoadError(err.message ?? '문서를 불러오지 못했어요.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.isLoggedIn])

  async function handleDelete(id) {
    await deleteDraft(id)
    setDrafts(await loadMyDrafts())
  }

  // 이 브라우저에서 쓴 글 목록 — 비회원의 유일한 회수 수단이라 로그인 여부와 무관하게 보여준다.
  const localDocsSection = localDocs.length > 0 && (
    <div className="rs-panel rs-home-section">
      <h2>이 브라우저에서 쓴 글 ({localDocs.length})</h2>
      <p className="rs-empty">
        비회원으로 작성한 글이에요. 수정하려면 작성할 때 정한 비밀번호가 필요해요.
      </p>
      {localDocs.map((d) => (
        <div key={d.id} className="rs-draft-row">
          <div>
            <p className="rs-draft-title">{d.title}</p>
            <p className="rs-draft-meta">
              {d.status === 'published' ? '발행함' : '초안'} · 마지막 기록{' '}
              {d.updatedAt?.slice(0, 10)}
            </p>
          </div>
          <div className="rs-draft-actions">
            <Link to={`/archive/${d.id}`} className="rs-btn rs-btn-primary">
              열기
            </Link>
            <button
              type="button"
              className="rs-btn"
              onClick={() => {
                forgetLocalDoc(d.id)
                setLocalDocs(getLocalDocs())
              }}
            >
              목록에서 지우기
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  if (auth.isAuthEnabled && !auth.loading && !auth.isLoggedIn) {
    return (
      <section>
        <header className="rs-page-head">
          <h1>마이페이지</h1>
          <p>로그인하면 내 계정에 저장된 기획서를 여기서 관리할 수 있어요.</p>
        </header>
        <div className="rs-panel rs-home-section">
          <p className="rs-empty">
            {/* 로그인 후 다시 이 페이지로 돌아오도록 from 을 넘긴다 */}
            <Link to="/login" state={{ from: '/me' }}>
              로그인
            </Link>{' '}
            또는{' '}
            <Link to="/signup" state={{ from: '/me' }}>
              회원가입
            </Link>{' '}
            후 이용해 주세요.
          </p>
        </div>
        {localDocsSection}
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

      {loadError && <p className="rs-editor-error">{loadError}</p>}

      {auth.isLoggedIn && <AccountSettings />}

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

      {localDocsSection}
    </section>
  )
}

export default MyPage
