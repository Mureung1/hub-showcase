import './ProjectIntro.css'

const PILLARS = [
  {
    icon: '🔁',
    title: '리텐션',
    problem: '한 번 쓰고 안 돌아옴',
    solution: '매일 갱신 — "어제 대비 +N new" 델타로 돌아올 이유를 만든다',
  },
  {
    icon: '🧭',
    title: '그라운딩',
    problem: '자기보고 기반 추천은 못 믿음',
    solution: '내 위키·GitHub를 ground truth로 — 실제 스킬에서 출발한다',
  },
  {
    icon: '🤖',
    title: '왜 에이전트?',
    problem: '챗은 구조적으로 매일 못 함',
    solution: '자율 일일 배치 실행 — 검색·검증·랭킹을 스스로 돌린다',
  },
]

const PIPELINE = [
  {
    step: '1 · 소스',
    desc: '내 위키·GitHub(실제 스킬) + 원티드·사람인·공식 채용 RSS(시장 공고)',
  },
  {
    step: '2 · 에이전트 배치 (매일 1회)',
    desc: '검색 → fetch·검증(만료·403 거르기) → 스킬갭 매칭 → 가능성 랭킹 → 스키마 검증 → 검증된 JSON',
  },
  {
    step: '3 · 정적 대시보드',
    desc: '코드 고정, 데이터만 매일 갱신 — 맞닿은 진로 / 스킬 갭 / 가능성순 / 마감일',
  },
]

const WALLS = [
  '데이터 합법 취득 — 관심 공고 URL 붙이기 + 승인 API + 공식 RSS',
  '가짜 확률 함정 회피 — 투명한 스킬 중첩 점수(내 스킬 ∩ JD)',
  '"매일"은 소음이 아닌 신호 — 델타만 보여주기',
  '비용 통제 — 추출은 싼 모델, 판단만 비싼 모델',
]

function ProjectIntro() {
  return (
    <main className="intro">
      <header className="intro__hero">
        <span className="intro__badge">개인 커리어 에이전트</span>
        <h1 className="intro__title">
          커리어 <span className="intro__title-accent">코파일럿</span>
        </h1>
        <p className="intro__tagline">
          내 위키·GitHub·관심 공고를 기반으로, 매일 자동으로{' '}
          <strong>나와 맞닿은 진로 · 스킬 갭 · 가능성 · 마감일</strong>을 조사해
          정적 웹 대시보드로 보여주는 진로 데일리 에이전트.
        </p>
        <p className="intro__positioning">
          <span className="intro__no">✕ 시장 전체 조회기 / 정보 덤프</span>
          <span className="intro__yes">
            ✓ 나를 위한, 검증된, "뭘 할지"로 바꿔주는 코파일럿
          </span>
        </p>
      </header>

      <section className="intro__section">
        <h2 className="intro__heading">닫은 3대 킬러</h2>
        <div className="intro__pillars">
          {PILLARS.map((p) => (
            <article key={p.title} className="pillar">
              <div className="pillar__icon">{p.icon}</div>
              <h3 className="pillar__title">{p.title}</h3>
              <p className="pillar__problem">{p.problem}</p>
              <p className="pillar__solution">{p.solution}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro__section">
        <h2 className="intro__heading">아키텍처 — 느린 배치 / 빠른 렌더 분리</h2>
        <ol className="intro__pipeline">
          {PIPELINE.map((s) => (
            <li key={s.step} className="pipeline__item">
              <span className="pipeline__step">{s.step}</span>
              <span className="pipeline__desc">{s.desc}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="intro__section">
        <h2 className="intro__heading">냉정한 벽 4개 (우선순위)</h2>
        <ul className="intro__walls">
          {WALLS.map((w, i) => (
            <li key={i} className="wall">
              <span className="wall__num">{i + 1}</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="intro__footer">
        <p>
          대시보드 = human-in-the-loop 면. <strong>에이전트가 검증·나열, 최종 판단은 나.</strong>
        </p>
        <p className="intro__footer-sub">
          개인용으로 시작(즉시 dogfood) · 신입 JD 한정 · 모든 항목에 {'{'}출처 URL, 조회시각, 확신도{'}'} 필수
        </p>
      </footer>
    </main>
  )
}

export default ProjectIntro
