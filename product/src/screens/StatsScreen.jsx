import TopBar from '../components/TopBar'
import { SUPPORTED_JOB, STATS } from '../data/mock'

// 02 통계 분석. mock 통계 데이터를 map으로 렌더한다.
function StatsScreen({ go }) {
  return (
    <>
      <TopBar step={2} label="통계 분석" job={SUPPORTED_JOB} backTo="select" backLabel="다른 직무" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="summary">
            <span className="eyebrow">백엔드 공고 {STATS.postCount}건 기반 mock 리서치</span>
            <h1>주니어 백엔드 공고는 기술 이름보다 데이터를 다루고 실패까지 처리하는 구현 범위를 봅니다.</h1>
            <p>여러 공고에서 반복되는 기술·조합·조건을 통계로 집계했습니다. 이 통계는 다음 단계(인재상 역산)에서 baseline과 편차를 읽는 기준이 됩니다.</p>
            <div className="data-note">
              <span>수집 범위: 최근 1년</span>
              <span>대상: 신입·주니어 포함 공고</span>
              <span>비교: 이전 1년 스냅샷</span>
            </div>
          </header>

          <section className="metric-grid" aria-label="요약 통계">
            {STATS.metrics.map((m) => (
              <div className="metric-card" key={m.caption}>
                <span className="num">{m.num}<small>{m.unit}</small></span>
                <span className="caption">{m.caption}</span>
              </div>
            ))}
          </section>

          <section className="section-block" id="tech">
            <div className="section-title">
              <h2>기술 이름보다 중요한, 함께 요구되는 기술 조합</h2>
              <span className="hint">전체 {STATS.postCount}건 중 동시 출현 기준</span>
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
              <div className="skill-bars">
                {STATS.skills.map((s) => (
                  <div className="skill-bar-row" key={s.name}>
                    <div className="skill-name">
                      <img className="tech-logo" src={`/logos/${s.logo}.svg`} alt={`${s.name} 로고`} />
                      <span><span className="rank">{s.rank}</span> {s.name}</span>
                    </div>
                    <div className="bar-track"><span className={`bar-fill bar-fill--${s.cls}`} style={{ width: `${s.pct}%` }}></span></div>
                    <div className="skill-count"><b>{s.count}</b> / {STATS.postCount}건</div>
                  </div>
                ))}
              </div>
              <p className="panel-note">
                기술별 빈도는 출발점입니다. 가장 많이 함께 등장한 Java·Spring·JPA·MySQL 조합을 기준으로, 한 도메인을 DB와 연결해 배포까지 완성하는 경험을 먼저 갖추는 편이 좋습니다.
              </p>
            </div>
          </section>

          <section className="section-block" id="trend">
            <div className="section-title">
              <h2>이전 1년과 비교하면 배포·비동기 처리 비중이 오르고 있습니다</h2>
              <span className="hint">이전 1년 → 최근 1년</span>
            </div>
            <div className="panel">
              <div className="requirement-list">
                {STATS.trend.map((t) => (
                  <div className="requirement-item" key={t.label}>
                    <strong>{t.label} <span className="ratio-pill">{t.delta}</span></strong>
                    <p>{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="section-block" id="conditions">
            <div className="section-title">
              <h2>학력·경력 조건은 유연하지만, 인프라·배포 언급이 함께 늘고 있습니다</h2>
              <span className="hint">대학생·신입 관점</span>
            </div>
            <div className="condition-grid">
              {STATS.conditions.map((c) => (
                <div className="condition-card" key={c.title}>
                  <h3>{c.title}</h3>
                  {c.stats.map(([b, span]) => (
                    <div className="condition-stat" key={span}><b>{b}</b><span>{span}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="section-block" id="companies">
            <div className="section-title">
              <h2>같은 백엔드라도 기업군마다 통계 성향이 다릅니다</h2>
              <span className="hint">기업군 뷰 · 언급 빈도 기준</span>
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

          <div className="nav-actions">
            <button className="btn btn-secondary" onClick={() => go('select')}>← 직무 다시 선택</button>
            <button className="btn btn-primary" onClick={() => go('reverse')}>인재상 역산 보기 →</button>
          </div>
        </article>

        <aside className="floating-nav" aria-label="리포트 목차">
          <p className="floating-nav__label">통계</p>
          <a className="is-current" href="#summary"><span className="dot"></span>요약</a>
          <a href="#tech"><span className="dot"></span>기술 조합·빈도</a>
          <a href="#trend"><span className="dot"></span>시계열 추세</a>
          <a href="#conditions"><span className="dot"></span>학력·경력</a>
          <a href="#companies"><span className="dot"></span>기업군 뷰</a>
        </aside>
      </main>
    </>
  )
}

export default StatsScreen
