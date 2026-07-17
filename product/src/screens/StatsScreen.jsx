import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import { SUPPORTED_JOB, STATS } from '../data/mock'

// 02 통계 분석 — 1차 슬라이스.
// 블록 1(KPI)·7(기술 빈도)·10(요구 항목 전체표)은 GET /api/stats 실데이터,
// 블록 5·6·8·9는 mock 유지, 블록 2·3·4는 다음 슬라이스 자리 표시.

const LOGO = { java: 'java', 'spring-boot': 'spring', mysql: 'mysql', jpa: 'jpa', redis: 'redis', docker: 'docker', git: 'git' }
const BAR_CLS = { java: 'java', 'spring-boot': 'spring', mysql: 'mysql', jpa: 'jpa', git: 'git' }
const KPI_CAPTION = {
  avg_required_skills: '공고당 평균 요구 역량 수',
  out_of_role_pct: '직무(서버 개발) 외 작업까지 요구',
  entry_label_gap_pct: '"신입 가능" 라벨인데 경력급 경험 요구',
  promoted_to_required_cnt: '1년 새 우대→필수로 이동한 항목',
  advanced_mention_pct: '대용량·동시성 등 심화 키워드 언급',
}
const TREND_LABEL = { increase: '증가 ↗', decrease: '감소 ↘', stable: '유지 →', unknown: '신규' }
const CONFIDENCE = { high: '높음', medium: '중간', low: '낮음' }
const SCOPE_BAR = ['', 'blue', 'green', 'amber', 'rose']

// 블록 5의 기울기 차트 한 열. 이전→최근 % 를 선으로 잇는다.
function TrendColumn({ tone, title, note, items }) {
  const y = (pct) => Math.max(14, 150 - pct * 1.45)
  const colors = { up: ['#16A34A', '#22C55E', '#86EFAC'], flat: ['#64748B', '#94A3B8', '#CBD5E1'], down: ['#E11D48', '#FB7185', '#FECDD3'] }[tone]
  return (
    <div className={`trend-chart-col trend-chart-col--${tone}`}>
      <header>{title} <span>{note}</span></header>
      {items.length === 0 ? (
        <p className="trend-empty">해당 항목 없음</p>
      ) : (
        <>
          <svg viewBox="0 0 250 180" role="img" aria-label={`${title} 기술 추이`}>
            <line x1="62" y1="14" x2="62" y2="150" stroke="#E2E8F0" />
            <line x1="188" y1="14" x2="188" y2="150" stroke="#E2E8F0" />
            <text x="62" y="168" fontSize="11" fill="#94A3B8" textAnchor="middle">이전</text>
            <text x="188" y="168" fontSize="11" fill="#94A3B8" textAnchor="middle">최근</text>
            {items.map((t, i) => (
              <g key={t.item_id}>
                <line x1="62" y1={y(t.prev_pct)} x2="188" y2={y(t.recent_pct)} stroke={colors[i]} strokeWidth="2.5" />
                <circle cx="62" cy={y(t.prev_pct)} r="4" fill={colors[i]} />
                <circle cx="188" cy={y(t.recent_pct)} r="4" fill={colors[i]} />
                <text x="196" y={y(t.recent_pct) + 3} fontSize="10.5" fontWeight="700" fill={colors[i]}>{t.recent_pct}%</text>
              </g>
            ))}
          </svg>
          <ul className="trend-key">
            {items.map((t, i) => (
              <li key={t.item_id}><i className="trend-dot" style={{ background: colors[i] }}></i>{t.name} <span>{t.prev_pct}→{t.recent_pct}%</span></li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StatsScreen({ go }) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [tableOpen, setTableOpen] = useState(false)

  useEffect(() => {
    fetch('/api/stats?job=backend')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => { setData(json); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') {
    return (
      <>
        <TopBar step={2} label="통계 분석" job={SUPPORTED_JOB} backTo="select" backLabel="다른 직무" go={go} />
        <main className="app-shell reader-layout"><p className="status-panel">공고 통계를 집계하는 중입니다…</p></main>
      </>
    )
  }
  if (status === 'error') {
    return (
      <>
        <TopBar step={2} label="통계 분석" job={SUPPORTED_JOB} backTo="select" backLabel="다른 직무" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">
            통계 서버에 연결하지 못했습니다. server 폴더에서 <code>npm start</code>로 서버가 켜져 있는지 확인해 주세요.
          </p>
        </main>
      </>
    )
  }

  const { meta, kpi, scope_expansion: scopeExpansion, inflation, trend3, labels, tech_freq: techFreq, items } = data
  const recentN = meta.snapshots.recent.n

  return (
    <>
      <TopBar step={2} label="통계 분석" job={SUPPORTED_JOB} backTo="select" backLabel="다른 직무" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="summary">
            <span className="eyebrow">백엔드 공고 {recentN}건 기반 리서치 · 이전 스냅샷 {meta.snapshots.prev.n}건 비교</span>
            <h1>공고의 절반 이상이 "신입"이라 쓰고 경력급 준비를 요구합니다. 기술 이름이 아니라 요구의 구조를 읽습니다.</h1>
            <p>여러 공고에서 반복되는 요구를 리얼리티 중심으로 집계했습니다. 이 통계는 다음 단계(인재상 역산)에서 baseline과 편차를 읽는 기준이 됩니다.</p>
            <div className="data-note">
              <span>{meta.snapshots.recent.label}: {recentN}건</span>
              <span>{meta.snapshots.prev.label}: {meta.snapshots.prev.n}건</span>
              <span>{meta.disclaimer}</span>
            </div>
          </header>

          {/* 블록 1 · 리얼리티 KPI — 실데이터 */}
          <section className="metric-grid" id="kpi" aria-label="리얼리티 KPI">
            {Object.entries(kpi).map(([key, m]) => (
              <div className={`metric-card${m.highlight ? ' metric-card--alert' : ''}`} key={key}>
                <span className="num">{m.value}<small>{m.unit}</small></span>
                <span className="caption">{KPI_CAPTION[key]}</span>
              </div>
            ))}
          </section>

          {/* 블록 2 · 요구 범위 확장 — 실데이터 */}
          <section className="section-block" id="scope">
            <div className="section-title">
              <h2>백엔드 공고인데 백엔드만 하지 않습니다</h2>
              <span className="hint">직무 외 작업을 요구한 공고 비율 · 최근 {recentN}건</span>
            </div>
            <div className="panel">
              {scopeExpansion.map((s, i) => (
                <div className="scope-row" key={s.tag}>
                  <div className="scope-name">{s.label} <small>{s.desc}</small></div>
                  <div className="bar-track">
                    <span className={`scope-fill${SCOPE_BAR[i] ? ` scope-fill--${SCOPE_BAR[i]}` : ''}`} style={{ width: `${s.pct}%` }}></span>
                  </div>
                  <div className="scope-count"><b>{s.pct}%</b> · {s.count}건</div>
                </div>
              ))}
              <p className="panel-note">
                "백엔드 개발자" 공고여도 절반 이상이 배포·테스트를 함께 요구합니다. 학습 범위를 서버 코드 안쪽으로만 잡으면 공고 요구와 어긋납니다.
              </p>
            </div>
          </section>

          {/* 블록 3 · 필수 인플레이션 — 실데이터 */}
          <section className="section-block" id="inflation">
            <div className="section-title">
              <h2>작년의 우대가 올해의 필수가 됐습니다</h2>
              <span className="hint">항목별 필수율 · 이전 → 최근 · 변화 큰 항목 자동 선별</span>
            </div>
            <div className="panel">
              {inflation.stable ? (
                <p className="panel-note">이 직군은 필수 요건 변화가 크지 않습니다. 요구가 안정적이라는 것 자체가 하나의 신호입니다.</p>
              ) : (
                inflation.items.map((it) => (
                  <div className="inflation-row" key={it.item_id}>
                    <div className="scope-name">{it.name}</div>
                    <div className="pair-bars">
                      <div className="pair-bar"><span>이전</span><div className="pair-track"><i className="pair-fill pair-fill--old" style={{ width: `${it.prev_ratio}%` }}></i></div></div>
                      <div className="pair-bar"><span>최근</span><div className="pair-track"><i className="pair-fill pair-fill--new" style={{ width: `${it.recent_ratio}%` }}></i></div></div>
                    </div>
                    <div className="inflation-delta">{it.prev_ratio}% → <b>{it.recent_ratio}%</b></div>
                  </div>
                ))
              )}
              {!inflation.stable && (
                <p className="panel-note">이 항목들은 "우대사항이니 나중에"라고 미루면 1년 뒤 필수가 되어 있을 확률이 높습니다. 로드맵 우선순위에 반영됩니다.</p>
              )}
            </div>
          </section>

          {/* 블록 4 — 3차 슬라이스 자리 */}
          <section className="section-block" id="upcoming">
            <div className="placeholder-panel">
              <strong>숨은 난이도 — 신입 공고 속 시니어급 문장</strong>
              <p>공고 원문 문장 추출(3차 슬라이스, LLM)이 연결되면 이 자리에 표시됩니다.</p>
            </div>
          </section>

          {/* 블록 7 · 기술 빈도 — 실데이터 */}
          <section className="section-block" id="tech">
            <div className="section-title">
              <h2>단일 기술 빈도는 시작점입니다</h2>
              <span className="hint">최근 1년 {recentN}건 기준 · 필수율 = 등장 공고 중 필수 표기 비율</span>
            </div>
            <div className="panel">
              <div className="skill-bars">
                {techFreq.slice(0, 8).map((s, i) => (
                  <div className="skill-bar-row" key={s.slug}>
                    <div className="skill-name">
                      {LOGO[s.slug] && <img className="tech-logo" src={`/logos/${LOGO[s.slug]}.svg`} alt="" />}
                      <span><span className="rank">{i + 1}</span> {s.name}</span>
                    </div>
                    <div className="bar-track">
                      <span className={`bar-fill bar-fill--${BAR_CLS[s.slug] || 'api'}`} style={{ width: `${s.pct}%` }}></span>
                    </div>
                    <div className="skill-count"><b>{s.count}</b> / {recentN}건</div>
                    <span className={`req-chip ${s.required_ratio >= 50 ? 'req-chip--must' : 'req-chip--nice'}`}>
                      필수율 {s.required_ratio}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="panel-note">
                아래 조합·추이와 함께 읽어야 준비 범위가 보입니다. 빈도 상위 기술이라도 필수율이 낮으면 우대 성격입니다.
              </p>
            </div>
          </section>

          {/* 블록 6 · 조합 — mock 유지 */}
          <section className="section-block" id="combo">
            <div className="section-title">
              <h2>기술은 조합으로, 조합은 구현 수준으로 읽습니다</h2>
              <span className="hint">mock · 3차 슬라이스에서 실데이터 연결</span>
            </div>
            <div className="panel">
              <div className="combination-grid">
                {STATS.combos.map((c) => (
                  <article className={`combination-card${c.primary ? ' combination-card--primary' : ''}`} key={c.title}>
                    <span className="combination-count">{c.count}</span>
                    <h3>{c.title}</h3>
                    <p>{c.desc}</p>
                    {c.chips.length > 0 && (
                      <div className="tag-list">
                        {c.chips.map((chip) => (
                          <span className="tag" key={chip.label}>
                            {chip.logo && <img src={`/logos/${chip.logo}.svg`} alt="" />}{chip.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="combination-level">{c.level}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* 블록 5 · 추이 — 실데이터, 차트 3개 분리 */}
          <section className="section-block" id="trend">
            <div className="section-title">
              <h2>늘어나는 기술과 줄어드는 기술</h2>
              <span className="hint">등장 비율 · 이전 1년 → 최근 1년 · 변화폭 유의미한 항목만</span>
            </div>
            <div className="trend3-grid">
              <TrendColumn tone="up" title="증가 ↗" note="비중 상승" items={trend3.increase} />
              <TrendColumn tone="flat" title="유지 →" note="기본기" items={trend3.stable} />
              <TrendColumn tone="down" title="감소 ↘" note="비중 하락" items={trend3.decrease} />
            </div>
          </section>

          {/* 블록 8 · 라벨 vs 현실 — 라벨 두 열 실데이터, 현실 열은 3차 */}
          <section className="section-block" id="conditions">
            <div className="section-title">
              <h2>공고의 라벨과 실제 요구는 다릅니다</h2>
              <span className="hint">라벨 분포는 실데이터 · 현실 열은 3차(LLM) 연결</span>
            </div>
            <div className="label-grid">
              <div className="label-col">
                <h3>학력 (라벨)</h3>
                {labels.edu.map((l) => (
                  <div className="label-item" key={l.label}><span>{l.label}</span><b>{l.pct}%</b></div>
                ))}
              </div>
              <div className="label-col">
                <h3>경력 (라벨)</h3>
                {labels.career.map((l) => (
                  <div className="label-item" key={l.label}><span>{l.label}</span><b>{l.pct}%</b></div>
                ))}
              </div>
              <div className="label-col label-col--pending">
                <h3>본문이 실제로 요구하는 것</h3>
                <p>문장 추출 에이전트(3차)가 연결되면 라벨과 실제 요구의 격차가 여기에 표시됩니다.</p>
              </div>
            </div>
          </section>

          {/* 블록 9 · 기업군 성향 — mock 유지 */}
          <section className="section-block" id="companies">
            <div className="section-title">
              <h2>기업군마다 힘주는 곳이 다릅니다</h2>
              <span className="hint">mock · 3차 슬라이스에서 히트맵으로 확장</span>
            </div>
            <div className="company-grid">
              {STATS.clusters.map((c) => (
                <div className="company-card" key={c.tag}>
                  <span className="company-size">{c.tag}</span>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <div className="tag-list">
                    {c.chips.map((chip) => (
                      <span className="tag" key={chip.label}>
                        {chip.logo && <img src={`/logos/${chip.logo}.svg`} alt="" />}{chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 블록 10 · 요구 항목 전체표 — 실데이터, 기본 접힘 */}
          <section className="section-block" id="items">
            <div className="section-title">
              <h2>요구 항목 전체표</h2>
              <span className="hint">역산 단계가 그대로 입력으로 받는 데이터 · {items.length}개 항목</span>
            </div>
            <div className="panel">
              <div className="fulltable-head">
                <p>근거를 직접 따져보고 싶을 때 펼쳐 보세요. 근거 원문 열은 문장 추출(3차) 연결 후 채워집니다.</p>
                <button className="btn btn-secondary btn-toggle" onClick={() => setTableOpen((v) => !v)}>
                  {tableOpen ? '접기 ▴' : `전체 ${items.length}개 펼치기 ▾`}
                </button>
              </div>
              {tableOpen && (
                <div className="table-scroll">
                  <table className="req-table">
                    <thead>
                      <tr><th>항목</th><th>필수율</th><th>전체</th><th>최고 기업군</th><th>추이</th><th>신뢰도</th></tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const top = Object.entries(it.freq_by_cluster).sort((a, b) => b[1] - a[1])[0]
                        return (
                          <tr key={it.item_id}>
                            <td>{it.name}</td>
                            <td className={it.required_ratio >= 50 ? 'cell-must' : 'cell-nice'}>{it.required_ratio}%</td>
                            <td>{it.freq_overall}%</td>
                            <td>{top ? `${top[0]} ${top[1]}%` : '—'}</td>
                            <td>
                              {TREND_LABEL[it.trend.direction]}
                              {it.trend.requirement_shift === 'preferred_to_required' && <span className="shift-tag">우대→필수</span>}
                            </td>
                            <td>{CONFIDENCE[it.confidence]} (n={it.support.n_overall})</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <div className="nav-actions">
            <button className="btn btn-secondary" onClick={() => go('select')}>← 직무 다시 선택</button>
            <button className="btn btn-primary" onClick={() => go('reverse')}>인재상 역산 보기 →</button>
          </div>
        </article>

        <aside className="floating-nav" aria-label="리포트 목차">
          <p className="floating-nav__label">통계</p>
          <a className="is-current" href="#summary"><span className="dot"></span>요약</a>
          <a href="#kpi"><span className="dot"></span>리얼리티 KPI</a>
          <a href="#scope"><span className="dot"></span>요구 범위 확장</a>
          <a href="#inflation"><span className="dot"></span>필수 인플레이션</a>
          <a href="#tech"><span className="dot"></span>기술 빈도</a>
          <a href="#combo"><span className="dot"></span>조합·구현 수준</a>
          <a href="#trend"><span className="dot"></span>증감 추이</a>
          <a href="#conditions"><span className="dot"></span>라벨 vs 현실</a>
          <a href="#companies"><span className="dot"></span>기업군 성향</a>
          <a href="#items"><span className="dot"></span>요구 항목 전체표</a>
        </aside>
      </main>
    </>
  )
}

export default StatsScreen
