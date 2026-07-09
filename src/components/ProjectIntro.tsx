import './ProjectIntro.css'

const MVP_MUST = [
  '업종 / 지역 / 사업자 규모 입력 폼',
  '조건에 맞는 지원사업 필터링 + 매칭도순·마감임박·지원금액 정렬',
  '공고문 핵심 요약 (지원대상·지원내용·신청기간·신청방법)',
]

const MVP_SHOULD = ['마감 임박 알림', '즐겨찾기 / 스크랩'] // MVP 이후 (plan.md 제외 항목)

const MVP_WONT = [
  '신청서 자동 작성',
  '로그인 / 회원 시스템',
  '전국 모든 지자체 커버',
]

const DATA_SOURCES = [
  {
    name: '기업마당',
    url: 'bizinfo.go.kr',
    priority: 'primary',
    note: 'MVP 1순위 — API 또는 리스트 페이지 파싱',
  },
  {
    name: 'K-스타트업',
    url: 'k-startup.go.kr',
    priority: 'secondary',
    note: '창업 관련 지원사업',
  },
  {
    name: '소상공인시장진흥공단',
    url: 'semas.or.kr',
    priority: 'secondary',
    note: '소상공인 특화',
  },
  {
    name: '정부24 / 지자체',
    url: '각 구청·시청',
    priority: 'later',
    note: '크롤링 난이도 높음 — MVP 후순위',
  },
]

const ROADMAP = [
  {
    week: '1주차',
    goal: '데이터 소스 확정 + 크롤러 프로토타입',
    detail: '기업마당 100~200건 확보, DB 스키마 설계',
  },
  {
    week: '2주차',
    goal: '필터링 로직 + 검색 UI',
    detail: 'AI 요약 파이프라인 (Claude API) 연동',
  },
  {
    week: '3주차',
    goal: '적합도 점수 알고리즘',
    detail: '알림 기능(선택), UI 다듬기',
  },
  {
    week: '4주차',
    goal: '사장님 인터뷰 / 테스트',
    detail: '버그 수정, 발표 자료 준비',
  },
]

const DIFFERENTIATORS = [
  {
    title: 'AI 요약',
    desc: '관공서 문체 공고문을 30초 안에 이해할 수 있는 쉬운 말로 변환',
  },
  {
    title: '"나 해당되는지" 자동 판정',
    desc: '조건 매칭률을 %로 표시 — 예: 적합도 85%',
  },
  {
    title: '필터링 + 알림 집중',
    desc: '신청 대행·서류 작성 없이, 지금 신청 가능한 사업만 골라 보여줌',
  },
]

const SAMPLE_PROGRAMS = [
  {
    title: '2026 소상공인 디지털 전환 지원',
    org: '중소벤처기업부',
    deadline: 'D-12',
    match: 92,
    summary: '카페·음식점 등 소상공인 대상 POS·배달앱 연동 비용 지원',
  },
  {
    title: '서울시 골목상권 활성화 자금',
    org: '서울시',
    deadline: 'D-5',
    match: 85,
    summary: '5인 미만 소상공인, 간판·인테리어 등 현장 개선비 최대 500만 원',
  },
  {
    title: '1인 창업 초기 자금 융자',
    org: '소상공인시장진흥공단',
    deadline: 'D-28',
    match: 78,
    summary: '예비·초기 창업자 대상 저금리 운전자금, 신청은 온라인',
  },
]

export default function ProjectIntro() {
  return (
    <article className="project-intro">
      <header className="intro-hero">
        <span className="intro-badge">4주 MVP 프로젝트</span>
        <h1 className="intro-title">
          소상공인 정부지원금
          <br />
          <em>큐레이터</em>
        </h1>
        <p className="intro-tagline">
          업종·지역·사업 규모만 입력하면, 지금 신청 가능한 지원사업만 골라서
          보여준다
        </p>
      </header>

      <section className="intro-section">
        <h2 className="section-label">서비스 미리보기</h2>
        <p className="section-desc">
          흩어진 공고를 한곳에서 — 사장님 조건에 맞는 지원사업만 골라 보여주는
          MVP 화면 구상
        </p>
        <div className="preview-panel">
          <div className="preview-form">
            <p className="preview-form-label">내 사업 정보</p>
            <div className="preview-field">
              <span>업종</span>
              <strong>음식점 · 카페</strong>
            </div>
            <div className="preview-field">
              <span>지역</span>
              <strong>서울특별시</strong>
            </div>
            <div className="preview-field">
              <span>규모</span>
              <strong>1인 사업자</strong>
            </div>
            <button type="button" className="preview-cta" disabled>
              지원사업 찾기
            </button>
          </div>
          <div className="preview-results">
            <p className="preview-results-header">
              신청 가능 <strong>3건</strong> · 마감일순
            </p>
            <ul className="preview-list">
              {SAMPLE_PROGRAMS.map((program) => (
                <li key={program.title} className="preview-card">
                  <div className="preview-card-top">
                    <span className="preview-match">{program.match}% 적합</span>
                    <span className="preview-deadline">{program.deadline}</span>
                  </div>
                  <h3>{program.title}</h3>
                  <p className="preview-org">{program.org}</p>
                  <p className="preview-summary">{program.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2 className="section-label">문제 재정의</h2>
        <div className="problem-grid">
          <div className="problem-card problem-card--main">
            <h3>진짜 문제</h3>
            <p>
              지원사업이 없는 게 아니라 <strong>정보가 흩어져 있고</strong>,
              공고문이 관공서 문체라 &ldquo;내가 대상인지&rdquo; 판단하기
              어렵다.
            </p>
            <ul className="source-list">
              <li>기업마당 · K-스타트업 · 소상공인시장진흥공단</li>
              <li>각 구청 / 시청 공고 · 지자체 홈페이지</li>
            </ul>
          </div>
          <div className="problem-card">
            <h3>타겟</h3>
            <p>
              자원(시간, 정보력)이 부족한 <strong>1인 / 소규모 사업자</strong>.
              온라인에 익숙하지 않거나 세무사·컨설턴트를 못 쓰는 영세
              사업자일수록 니즈가 크다.
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2 className="section-label">핵심 가치 제안</h2>
        <blockquote className="value-quote">
          &ldquo;업종·지역·사업 규모만 입력하면, 지금 신청 가능한 지원사업만
          골라서 보여준다&rdquo;
        </blockquote>
        <p className="value-note">
          MVP는 <strong>필터링 + 매칭</strong>에 집중 — 알림·신청 대행·서류
          작성 지원은 과감히 버린다.
        </p>
      </section>

      <section className="intro-section">
        <h2 className="section-label">데이터 소스 전략</h2>
        <p className="section-desc">
          이 서비스는 사실상 <strong>데이터 파이프라인 싸움</strong>이다. 4주
          프로젝트에서는 기업마당 하나만 안정적으로 파싱하는 것부터 시작한다.
        </p>
        <div className="data-sources">
          {DATA_SOURCES.map((src) => (
            <div
              key={src.name}
              className={`data-source data-source--${src.priority}`}
            >
              <div className="data-source-header">
                <span className="data-source-name">{src.name}</span>
                <span className="data-source-url">{src.url}</span>
              </div>
              <p>{src.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="intro-section">
        <h2 className="section-label">MVP 기능 범위</h2>
        <div className="mvp-grid">
          <div className="mvp-column mvp-column--must">
            <h3>
              <span className="mvp-icon">✓</span> Must
            </h3>
            <ul>
              {MVP_MUST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="mvp-column mvp-column--should">
            <h3>
              <span className="mvp-icon">+</span> Should
            </h3>
            <ul>
              {MVP_SHOULD.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="mvp-column mvp-column--wont">
            <h3>
              <span className="mvp-icon">✕</span> Won&apos;t
            </h3>
            <ul>
              {MVP_WONT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2 className="section-label">차별화 포인트</h2>
        <div className="diff-grid">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="diff-card">
              <h3>{d.title}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="intro-section">
        <h2 className="section-label">4주 로드맵</h2>
        <ol className="roadmap">
          {ROADMAP.map((item, i) => (
            <li key={item.week} className="roadmap-item">
              <div className="roadmap-week">
                <span className="roadmap-num">{i + 1}</span>
                {item.week}
              </div>
              <div className="roadmap-content">
                <strong>{item.goal}</strong>
                <span>{item.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="intro-section intro-section--last">
        <h2 className="section-label">검증 방법</h2>
        <div className="validation-grid">
          <div className="validation-card">
            <span className="validation-timing">1주차 전</span>
            <p>
              주변 소상공인 3~5명에게 &ldquo;이런 게 있으면 쓰시겠어요?&rdquo;
              인터뷰 — 데이터 파이프라인에 시간 쓰기 <strong>전에</strong> 니즈
              재확인
            </p>
          </div>
          <div className="validation-card">
            <span className="validation-timing">4주차</span>
            <p>
              실제로 필터링된 지원사업이 해당 사장님 업종에 맞는지{' '}
              <strong>정확도 체크</strong>
            </p>
          </div>
        </div>
      </section>
    </article>
  )
}
