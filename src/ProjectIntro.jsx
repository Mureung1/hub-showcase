import { Fragment, useState } from 'react'
import './ProjectIntro.css'

const VERDICT_LABEL = {
  sufficient: '근거 있음',
  insufficient: '근거 없음 · 감정적 판단',
  unverifiable: '확인 불가',
}

const CLAIMS = [
  {
    id: 'earnings',
    text: '최근 분기 영업이익이 늘어서 샀다',
    breakdown: [{ verdict: 'sufficient' }],
    note: '최근 공시된 분기보고서의 영업이익 증가 수치와 일치합니다.',
  },
  {
    id: 'mixed',
    text: '실적도 좋고 뉴스도 좋아서 샀다',
    breakdown: [
      { type: '실적 근거', verdict: 'sufficient' },
      { type: '뉴스 근거', verdict: 'unverifiable' },
    ],
    note: '근거 유형을 나눠서 판정합니다. 유형마다 결과가 다를 수 있어요.',
  },
  {
    id: 'vibe',
    text: '커뮤니티에서 다들 오른다고 해서 샀다',
    breakdown: [{ verdict: 'insufficient' }],
    note: '추출 가능한 근거가 없습니다. 어떤 정보를 보고 판단했나요?',
  },
]

const PIPELINE = [
  {
    step: 'A',
    title: '종목 공부 Agent',
    body: '종목명을 입력하면 공시와 재무제표를 조회해 초보자용 요약 리포트를 만들어줍니다.',
  },
  {
    step: 'B',
    title: '현재가·적정가 분석 Agent',
    body: 'PER·PBR·ROE 등 재무지표로 적정 예상가 범위를 계산해, 지금 가격이 고평가인지 저평가인지 보여줍니다.',
  },
  {
    step: 'C',
    title: '근거 검증 Agent',
    body: '"실적이 좋아질 것 같아서 샀다" 같은 매수 이유를 입력하면, 실제 공시·재무 데이터와 대조해 근거가 충분한지 판정합니다.',
  },
]

function Stamp({ verdict, type }) {
  return (
    <div className="verdict-row">
      {type && <span className="stamp-type">{type}</span>}
      <span className={`stamp stamp--${verdict}`} key={verdict + (type ?? '')}>
        {VERDICT_LABEL[verdict]}
      </span>
    </div>
  )
}

function ProjectIntro() {
  const [selectedId, setSelectedId] = useState(CLAIMS[0].id)
  const selected = CLAIMS.find((c) => c.id === selectedId)

  return (
    <main className="intro">
      <div className="intro-inner">
        <div className="filing-strip">
          <span>
            문서번호 <span className="filing-tag">EVD-2026-Q2-0417</span>
          </span>
          <span>예시 기준일 2026-06-30 분기보고서</span>
        </div>

        <header className="intro-header">
          <p className="intro-eyebrow">AI Agent Challenge</p>
          <h1>대학생 투자자를 위한 근거 검증 Agent</h1>
          <p className="intro-tagline">
            종목을 추천하지 않습니다. 이미 내린 매수 판단이 실제 데이터로
            뒷받침되는지 검증합니다.
          </p>
        </header>

        <section className="exhibit" aria-labelledby="exhibit-label">
          <p className="exhibit-label" id="exhibit-label">
            증거 자료 1호 — 매수 이유 판정
          </p>
          <p className="exhibit-prompt">
            아래 매수 이유 중 하나를 눌러 어떻게 판정되는지 확인해보세요.
          </p>

          <div className="claim-chips" role="group" aria-label="매수 이유 예시">
            {CLAIMS.map((claim) => (
              <button
                key={claim.id}
                type="button"
                className="claim-chip"
                aria-pressed={claim.id === selectedId}
                onClick={() => setSelectedId(claim.id)}
              >
                {claim.text}
              </button>
            ))}
          </div>

          <div className="verdict-stage">
            <p className="verdict-claim">{selected.text}</p>
            {selected.breakdown.map((b, i) => (
              <Stamp key={i} verdict={b.verdict} type={b.type} />
            ))}
            <p className="verdict-note">{selected.note}</p>
          </div>

          <p className="exhibit-caption">
            예시입니다 · 실제 판정은 공시·재무 데이터 대조 후 제공됩니다
          </p>
        </section>

        <section className="section intro-problem">
          <p className="section-kicker">Problem statement</p>
          <h2>왜 필요한가</h2>
          <p>
            <strong>
              대학생 소액 투자자가 매수 판단의 근거를 검증할 수단이 없어 같은
              실수를 반복합니다.
            </strong>{' '}
            재무제표를 읽을 줄 모르고, 매수 근거가 대부분 &lsquo;감&rsquo;이거나
            커뮤니티에서 들은 얘기이기 때문입니다.
          </p>
        </section>

        <section className="section intro-features">
          <p className="section-kicker">Agent pipeline</p>
          <h2>핵심 기능</h2>
          <div className="pipeline">
            {PIPELINE.map((p, i) => (
              <Fragment key={p.step}>
                {i > 0 && (
                  <div className="pipeline-arrow" aria-hidden="true">
                    <span>→</span>
                  </div>
                )}
                <div className="pipeline-step">
                  <span className="pipeline-step-badge">{p.step}</span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        <footer className="intro-footer">
          <p className="intro-footer-label">Output sources</p>
          <ul className="intro-footer-sources">
            <li>OpenDART 공시 데이터</li>
            <li>LangGraph Agent</li>
            <li>근거 검증 파이프라인</li>
          </ul>
        </footer>
      </div>
    </main>
  )
}

export default ProjectIntro
