import { useEffect, useMemo, useState } from 'react'
import DocumentCard from '../components/DocumentCard.jsx'
import { seedDocuments } from '../data/documents.js'
import { categories, genres, genreOfGame } from '../data/gameSystems.js'
import { loadPublished } from '../lib/storage.js'
import './pages.css'

const SORTS = [
  { id: 'latest', label: '최신순' },
  { id: 'popular', label: '인기순' },
]

function ArchivePage() {
  // 필터는 문서 수와 무관하게 개수가 고정된 축(장르·분류)으로만 건다.
  // systemTag는 문서마다 값이 달라 필터로 쓰면 칩이 문서 수만큼 늘어난다(검색으로 대신한다).
  const [genre, setGenre] = useState(null)
  const [category, setCategory] = useState(null)
  const [sort, setSort] = useState('latest')
  const [query, setQuery] = useState('')
  const [hideExamples, setHideExamples] = useState(false)
  const [published, setPublished] = useState([])
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    loadPublished()
      .then((docs) => {
        setPublished(docs)
        setLoadError(null)
      })
      // 조용히 삼키면 "글이 없는 것"처럼 보이므로 실패를 드러낸다.
      .catch((err) => setLoadError(err.message ?? '문서를 불러오지 못했어요.'))
  }, [])

  // DB 발행 문서 + 프론트 시드 문서를 in-memory 병합 (시드는 아직 DB에 없음)
  const allDocs = useMemo(() => [...published, ...seedDocuments], [published])

  const keyword = query.trim().toLowerCase()
  const docs = allDocs
    // AI 예시가 사람 글을 덮지 않도록 끌 수 있게 한다(기본은 함께 노출).
    .filter((d) => (hideExamples ? !d.isExample : true))
    .filter((d) => genre === null || genreOfGame(d.gameTag) === genre)
    .filter((d) => category === null || d.category === category)
    // 제목·게임·시스템·분류·작성자를 대상으로 하는 단순 키워드 검색
    .filter((d) =>
      keyword === ''
        ? true
        : [d.title, d.gameTag, d.systemTag, d.category, d.author]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(keyword)),
    )
    .sort((a, b) =>
      sort === 'popular'
        ? b.likes - a.likes
        : (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
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

      {loadError && <p className="rs-editor-error">{loadError}</p>}

      <input
        className="rs-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목·게임·시스템으로 검색"
        aria-label="문서 검색"
      />

      <div className="rs-filter-row" role="group" aria-label="장르 필터">
        <span className="rs-filter-label">장르</span>
        <button
          type="button"
          className={`rs-chip${genre === null ? ' is-selected' : ''}`}
          onClick={() => setGenre(null)}
        >
          전체
        </button>
        {genres.map((g) => (
          <button
            key={g}
            type="button"
            className={`rs-chip${genre === g ? ' is-selected' : ''}`}
            onClick={() => setGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="rs-filter-row" role="group" aria-label="분류 필터">
        <span className="rs-filter-label">분류</span>
        <button
          type="button"
          className={`rs-chip${category === null ? ' is-selected' : ''}`}
          onClick={() => setCategory(null)}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`rs-chip${category === c ? ' is-selected' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
        <span className="rs-filter-spacer" />
        <button
          type="button"
          className={`rs-chip${hideExamples ? ' is-selected' : ''}`}
          onClick={() => setHideExamples((v) => !v)}
          aria-pressed={hideExamples}
        >
          예시 제외
        </button>
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

      {category !== null && docs.length > 1 && (
        <p className="rs-compare-hint">
          「{category}」를 다룬 문서 {docs.length}편 — 같은 관점의 서로 다른 접근을 비교해 보세요.
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
