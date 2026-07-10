import { Link } from 'react-router-dom'

// 5 · 추천 결과 목록
const FILTERS = [
  { label: '전체', active: true },
  { label: 'JavaScript', active: false },
  { label: '쉬움', active: false },
  { label: '웹', active: false },
]

const ISSUES = [
  {
    badge: { label: '쉬움', tone: 'blue' },
    lang: { name: 'JavaScript', cls: 'lang-js' },
    repo: 'chartjs/Chart.js',
    inum: '#11821',
    stars: '64.2k',
    title: 'Tooltip 위치가 작은 화면에서 잘리는 문제 수정',
    tags: [
      { label: 'good first issue', cls: 'tag-gfi' },
      { label: 'bug', cls: 'tag-bug' },
      { label: 'CSS' },
      { label: 'DOM' },
    ],
    why: (
      <>
        <b>주 언어 JavaScript와 일치</b>해요. 재현 방법이 명확하고 변경 범위가 작아 첫 기여로 딱
        좋아요.
      </>
    ),
  },
  {
    badge: { label: '입문', tone: 'green' },
    lang: { name: 'JavaScript', cls: 'lang-js' },
    repo: 'expressjs/express',
    inum: '#5412',
    stars: '65.8k',
    title: '라우팅 예제 문서에 async/await 사용법 추가',
    tags: [
      { label: 'good first issue', cls: 'tag-gfi' },
      { label: 'documentation', cls: 'tag-doc' },
      { label: 'web' },
    ],
    why: (
      <>
        <b>관심 분야 '웹'과 일치</b>해요. 코드 변경 없이 문서만 다뤄서 첫 PR 흐름 익히기 좋아요.
      </>
    ),
  },
  {
    badge: { label: '보통', tone: 'amber' },
    lang: { name: 'TypeScript', cls: 'lang-ts' },
    repo: 'vitejs/vite',
    inum: '#16233',
    stars: '71.4k',
    title: 'dev 서버 에러 메시지에 파일 경로 함께 출력',
    tags: [
      { label: 'enhancement', cls: 'tag-enh' },
      { label: 'DX' },
      { label: 'CLI' },
    ],
    why: (
      <>
        JavaScript 경험으로 접근할 수 있으면서 <b>TypeScript로 한 단계 도전</b>해볼 만해요.
      </>
    ),
  },
]

function Result() {
  return (
    <>
      <div className="r-head">
        <h1>이런 이슈는 어때요?</h1>
        <p>
          딱 맞는 이슈 <span className="accent">6개</span>를 찾았어요. 이슈를 눌러 자세히
          확인해보세요.
        </p>
        <div className="filterbar">
          {FILTERS.map((filter) => (
            <span key={filter.label} className={filter.active ? 'filter filter-active' : 'filter'}>
              {filter.label}
            </span>
          ))}
        </div>
      </div>

      {ISSUES.map((issue) => (
        <Link className="card" to="/detail" key={issue.repo + issue.inum}>
          <div className="card-top">
            <span className={`badge badge-${issue.badge.tone}`}>{issue.badge.label}</span>
            <span className="repo">
              <span className={`lang ${issue.lang.cls}`}>
                <span className="sw" />
                {issue.lang.name}
              </span>{' '}
              · <b>{issue.repo}</b> <span className="inum">{issue.inum}</span> ·{' '}
              <span className="star">★</span> {issue.stars} · 활발
            </span>
          </div>
          <h2 className="i-title">{issue.title}</h2>
          <div className="tags">
            {issue.tags.map((tag) => (
              <span key={tag.label} className={tag.cls ? `tag ${tag.cls}` : 'tag'}>
                {tag.label}
              </span>
            ))}
          </div>
          <div className="why">
            <span className="ic">↣</span>
            <div>{issue.why}</div>
          </div>
        </Link>
      ))}

      <p className="foot-note">조건에 맞는 결과가 부족하면 난이도·분야를 완화해 다시 찾아드려요</p>
    </>
  )
}

export default Result
