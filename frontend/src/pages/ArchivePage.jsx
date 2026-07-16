import { useEffect, useMemo, useState } from 'react'
import DocumentCard from '../components/DocumentCard.jsx'
import { seedDocuments } from '../data/documents.js'
import { loadPublished } from '../lib/storage.js'
import './pages.css'

const SORTS = [
  { id: 'latest', label: '최신순' },
  { id: 'popular', label: '인기순' },
]

function ArchivePage() {
  const [systemTag, setSystemTag] = useState(null)
  const [sort, setSort] = useState('latest')
  const [published, setPublished] = useState([])

  useEffect(() => {
    loadPublished()
      .then(setPublished)
      .catch(() => {})
  }, [])

  // DB 발행 문서 + 프론트 시드 문서를 in-memory 병합 (시드는 아직 DB에 없음)
  const allDocs = useMemo(() => [...published, ...seedDocuments], [published])
  const systemTags = [...new Set(allDocs.map((d) => d.systemTag))]

  const docs = allDocs
    .filter((d) => systemTag === null || d.systemTag === systemTag)
    .sort((a, b) =>
      sort === 'popular' ? b.likes - a.likes : b.publishedAt.localeCompare(a.publishedAt),
    )

  return (
    <section>
      <header className="rs-page-head">
        <h1>둘러보기</h1>
        <p>
          같은 시스템을 다룬 문서를 나란히 읽어보세요 — 정답이 없는 분야에서는 "남들은 어떻게
          접근했나"가 최고의 교재입니다.
        </p>
      </header>

      <div className="rs-filter-row" role="group" aria-label="시스템 유형 필터">
        <button
          type="button"
          className={`rs-chip${systemTag === null ? ' is-selected' : ''}`}
          onClick={() => setSystemTag(null)}
        >
          전체
        </button>
        {systemTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`rs-chip${systemTag === tag ? ' is-selected' : ''}`}
            onClick={() => setSystemTag(tag)}
          >
            {tag}
          </button>
        ))}
        <span className="rs-filter-spacer" />
        {SORTS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`rs-chip${sort === id ? ' is-selected' : ''}`}
            onClick={() => setSort(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {systemTag !== null && docs.length > 1 && (
        <p className="rs-compare-hint">
          「{systemTag}」을 다룬 문서 {docs.length}편 — 같은 주제에 대한 서로 다른 접근을 비교해
          보세요.
        </p>
      )}

      <div className="rs-grid">
        {docs.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  )
}

export default ArchivePage
