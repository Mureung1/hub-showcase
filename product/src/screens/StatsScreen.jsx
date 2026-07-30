import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import AnalysisNotice from '../components/AnalysisNotice'
import SectionNav from '../components/SectionNav'
import useScrollSpy from '../hooks/useScrollSpy'
import { fetchJson, isJobNotReady } from '../hooks/apiFetch'
import { getHeatmapLevel, getTechIconPath } from '../data/techPresentation'

const NAV_IDS = ['summary', 'kpi', 'scope', 'inflation', 'difficulty', 'tech', 'combo', 'trend', 'conditions', 'companies', 'items']
const NAV_ITEMS = [['summary', '요약'], ['kpi', '리얼리티 KPI'], ['scope', '요구 범위 확장'], ['inflation', '필수 인플레이션'], ['difficulty', '숨은 난이도'], ['tech', '기술 빈도'], ['combo', '조합·구현 수준'], ['trend', '증감 추이'], ['conditions', '라벨 vs 현실'], ['companies', '기업군 성향'], ['items', '요구 항목 전체표']]

// 02 통계 분석 — 1차 슬라이스.
// 블록 번호와 순서는 docs/plan.md 9.2의 ①~⑩을 따른다. 데이터 출처는 각 블록 주석에 표기한다.
// 직무는 App 이 내려주는 job prop({ job_role_id, display_name })을 쓴다. 직무 이름을 화면에 적지 않는다.

const BAR_CLS = { java: 'java', 'spring-boot': 'spring', mysql: 'mysql', jpa: 'jpa', git: 'git' }
const KPI_CAPTION = {
  avg_required_skills: '공고당 평균 요구 역량 수',
  out_of_role_pct: '해당 직무 밖의 작업까지 요구',
  entry_label_gap_pct: '"신입 가능" 라벨인데 경력급 경험 요구',
  promoted_to_required_cnt: '1년 새 우대→필수로 이동한 항목',
  advanced_mention_pct: '심화 수준(대용량·동시성 등) 키워드 언급',
}
const TREND_LABEL = { increase: '증가 ↗', decrease: '감소 ↘', stable: '유지 →', unknown: '신규' }
const CONFIDENCE = { high: '높음', medium: '중간', low: '낮음' }
const SCOPE_BAR = ['', 'blue', 'green', 'amber', 'rose']

function TechMark({ name, slug }) {
  return <img className="tech-logo" src={getTechIconPath(slug)} alt={`${name} 아이콘`} />
}

function HeatmapCell({ cell }) {
  const level = getHeatmapLevel(cell.pct)
  return (
    <td className={`hm hm--${level?.tone ?? 0}`}>
      <span className="hm-lv">{level?.label ?? '—'}</span>
      <span className="hm-pc">{level ? `${cell.pct}%` : '값 없음'}</span>
    </td>
  )
}

// 블록 7(추이)의 기울기 차트 한 열. 이전→최근 % 를 선으로 잇는다.
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

function StatsScreen({ go, job }) {
  const jobRoleId = job.job_role_id
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error | notready
  const activeSection = useScrollSpy(NAV_IDS)

  useEffect(() => {
    // 직무가 바뀌면 화면이 다시 마운트되므로 status 초기값이 loading 이다. 여기서 다시 세우지 않는다.
    const controller = new AbortController()
    fetchJson(`/api/stats?job=${encodeURIComponent(jobRoleId)}`, { signal: controller.signal })
      .then((json) => { setData(json); setStatus('ready') })
      .catch((error) => {
        if (error.name === 'AbortError') return
        // 활성 분석 결과가 없는 직무는 오류가 아니라 "아직 준비 안 됨"으로 안내한다.
        setStatus(isJobNotReady(error.code) ? 'notready' : 'error')
      })
    return () => controller.abort()
  }, [jobRoleId])

  if (status === 'loading') {
    return (
      <>
        <TopBar step={2} label="통계 분석" job={job.display_name} backTo="select" backLabel="다른 직무" go={go} />
        <main className="app-shell reader-layout"><p className="status-panel">공고 통계를 집계하는 중입니다…</p></main>
      </>
    )
  }
  if (status === 'notready') {
    return (
      <>
        <TopBar step={2} label="통계 분석" job={job.display_name} backTo="select" backLabel="다른 직무" go={go} />
        <main className="app-shell reader-layout">
          <AnalysisNotice jobName={job.display_name} onBack={() => go('select')} />
        </main>
      </>
    )
  }
  if (status === 'error') {
    return (
      <>
        <TopBar step={2} label="통계 분석" job={job.display_name} backTo="select" backLabel="다른 직무" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">
            통계 서버에 연결하지 못했습니다. server 폴더에서 <code>npm start</code>로 서버가 켜져 있는지 확인해 주세요.
          </p>
        </main>
      </>
    )
  }

  const { meta, kpi, scope_expansion: scopeExpansion, inflation, trend3, labels, advanced, combos, reality, cluster_axes: clusterAxes, tech_freq: techFreq, items } = data
  const recentN = meta.snapshots.recent.n

  return (
    <>
      <TopBar step={2} label="통계 분석" job={job.display_name} backTo="select" backLabel="다른 직무" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="summary">
            <span className="eyebrow">{job.display_name} 공고 {recentN}건 기반 리서치 · 이전 스냅샷 {meta.snapshots.prev.n}건 비교</span>
            <h1>공고의 절반 이상이 "신입"이라 쓰고 경력급 준비를 요구합니다. 기술 이름이 아니라 요구의 구조를 읽습니다.</h1>
            <p>여러 공고에서 반복되는 요구를 리얼리티 중심으로 집계했습니다. 이 통계는 다음 단계(채용공고 해석)에서 직무 공통 기대치와의 차이를 읽는 기준이 됩니다.</p>
            <div className="data-note">
              <span>{meta.snapshots.recent.label}: {recentN}건</span>
              <span>{meta.snapshots.prev.label}: {meta.snapshots.prev.n}건</span>
            </div>
          </header>

          {/* 블록 1 · 리얼리티 KPI — 생성 데이터 */}
          <section className="metric-grid" id="kpi" aria-label="리얼리티 KPI">
            {Object.entries(kpi).map(([key, m]) => (
              <div className={`metric-card${m.highlight ? ' metric-card--alert' : ''}`} key={key}>
                <span className="num">{m.value}<small>{m.unit}</small></span>
                <span className="caption">{KPI_CAPTION[key]}</span>
              </div>
            ))}
          </section>

          {/* 블록 2 · 요구 범위 확장 — 생성 데이터 */}
          <section className="section-block" id="scope">
            <div className="section-title">
              <h2>{job.display_name} 공고인데 그 일만 하지 않습니다</h2>
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
                "{job.display_name}" 공고여도 상당수가 직무 경계 밖의 작업을 함께 요구합니다. 학습 범위를 직무 이름 안쪽으로만 잡으면 공고 요구와 어긋납니다.
              </p>
            </div>
          </section>

          {/* 블록 3 · 필수 인플레이션 — 생성 데이터 */}
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

          {/* 블록 4 · 숨은 난이도 — 생성 데이터의 추출 완료 필드 집계 */}
          <section className="section-block" id="difficulty">
            <div className="section-title">
              <h2>신입 공고에 숨어 있는 시니어급 문장들</h2>
              <span className="hint">공고 원문에서 추출한 심화 요구 문장 · 등장 비율</span>
            </div>
            <div className="difficulty-grid">
              {advanced.map((a) => (
                <div className="difficulty-card" key={a.type}>
                  <span className="difficulty-pct">{a.pct}%<small>{a.count} / {recentN}건</small></span>
                  <h3>{a.label}</h3>
                  <blockquote>"{a.quote}"</blockquote>
                  {a.more_count > 0 && <span className="quote-more">비슷한 문장 {a.more_count}개 더 있음</span>}
                </div>
              ))}
            </div>
          </section>

          {/* 블록 5 · 기술 빈도 — 생성 데이터 */}
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
                      <TechMark name={s.name} slug={s.slug} />
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

          {/* 블록 6 · 조합 — 동시 출현 집계 + 구현 수준 설명 */}
          <section className="section-block" id="combo">
            <div className="section-title">
              <h2>기술은 조합으로, 조합은 구현 수준으로 읽습니다</h2>
              <span className="hint">동시 출현 건수와 공고가 기대하는 구현 수준을 함께 비교</span>
            </div>
            <div className="panel">
              <div className="combination-grid">
                {combos.map((c, i) => (
                  <article className={`combination-card${i === 0 ? ' combination-card--primary' : ''}`} key={c.id}>
                    <span className="combination-count">{c.count} / {recentN}건</span>
                    <h3>{c.name}</h3>
                    <p>{c.desc}</p>
                    <span className="combination-level">기대 수준: {c.level}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* 블록 7 · 추이 — 생성 데이터, 차트 3개 분리 */}
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

          {/* 블록 8 · 라벨 vs 현실 — 공고 라벨과 본문 요구 비교 */}
          <section className="section-block" id="conditions">
            <div className="section-title">
              <h2>공고의 라벨과 실제 요구는 다릅니다</h2>
              <span className="hint">공고 라벨과 본문에서 확인한 실제 준비 수준을 비교</span>
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
              <div className="label-col label-col--reality">
                <h3>본문이 실제로 요구하는 것</h3>
                {reality.map((r) => (
                  <div className={`label-item${r.pct >= 40 ? ' label-item--hot' : ''}`} key={r.tag}>
                    <span>{r.label}</span><b>{r.pct}%</b>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 블록 9 · 기업군 성향 — 생성 데이터 히트맵 (색+텍스트+숫자) */}
          <section className="section-block" id="companies">
            <div className="section-title">
              <h2>기업군별 강조축 · 전체 기간 30건</h2>
              <span className="hint">최근 18건과 이전 12건을 합산한 참고용 비교 · 기업군별 n=5</span>
            </div>
            <div className="panel">
              <p className="heatmap-scroll-hint">옆으로 밀어 전체 항목 보기 →</p>
              <div className="heatmap-scroll">
                <table className="heatmap">
                  <thead>
                    <tr>
                      <th>기업군</th>
                      {clusterAxes.axes.map((a) => <th key={a}>{a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {clusterAxes.rows.map((row) => (
                      <tr key={row.cluster}>
                        <td>{row.cluster} <small>n={row.n}</small></td>
                        {row.cells.map((cell) => <HeatmapCell key={cell.axis} cell={cell} />)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="panel-note">생성 데이터의 기업군별 표본을 확보하기 위해 전체 기간을 합산했습니다. 강은 70% 이상, 중은 31~69%, 약은 30% 이하이며 값이 없을 때만 —로 표시합니다.</p>
            </div>
          </section>

          {/* 블록 10 · 요구 항목 전체표 — 생성 데이터, 기본 접힘 */}
          <section className="section-block" id="items">
            <div className="section-title">
              <h2>요구 항목 전체표</h2>
              <span className="hint">공고 해석 단계가 그대로 입력으로 받는 데이터 · {items.length}개 항목</span>
            </div>
            <div className="panel">
              <div className="fulltable-head">
                <p>표 안을 스크롤해 전체 {items.length}개 항목을 볼 수 있습니다. 각 항목의 근거 문장은 채용공고 해석 화면에서 확인할 수 있습니다.</p>
              </div>
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
            </div>
          </section>

          <div className="nav-actions">
            <button className="btn btn-secondary" onClick={() => go('select')}>← 직무 다시 선택</button>
            <button className="btn btn-primary" onClick={() => go('reverse')}>채용공고 해석 보기 →</button>
          </div>
        </article>

        <SectionNav label="통계" ariaLabel="리포트 목차" items={NAV_ITEMS} active={activeSection} />
      </main>
    </>
  )
}

export default StatsScreen
