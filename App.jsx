import "./styles/theme.css";
import "./styles/App.css";

function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">AI 투자분석</div>

        <nav className="nav-menu">
          <button className="nav-item active">대시보드</button>
          <button className="nav-item">관심 종목</button>
          <button className="nav-item">기업 정보</button>
          <button className="nav-item">세팅</button>
          
          
        </nav>

        <div className="sidebar-help">
          <strong>도움이 필요하신가요?</strong>
          <p>AI 분석 설정을 확인해보세요.</p>
          <button>가이드 보기</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div>
            <p className="eyebrow">AI Investment Dashboard</p>
            <h1>기업 투자 분석</h1>
          </div>

          <div className="search-box">
            <input placeholder="종목명 또는 종목코드 검색" />
            <button>검색</button>
          </div>
        </header>

        <section className="summary-grid">
          <article className="card stat-card">
            <span>현재가</span>
            <strong>78,500원</strong>
            <em className="up">+2.4%</em>
          </article>

          <article className="card stat-card">
            <span>금(원/g)</span>
            <strong>197,810</strong>
            <em className="down">-0.55%</em>
          </article>

          <article className="card stat-card">
            <span>환율</span>
            <strong>1,510/USD</strong>
            <em className="up">+0.15%</em>
          </article>

          <article className="card stat-card">
            <span>투자의견</span>
            <strong>BUY</strong>
            <em className="up">목표가 92,000원</em>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="card chart-card">
            <div className="card-title-row">
              <h2>재무추이 차트</h2>
              <select>
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
              </select>
            </div>

           <div className="finance-chart">
  {[
    { label: "매출", value: 302, height: "88%" },
    { label: "영업이익", value: 35, height: "48%" },
    { label: "순이익", value: 26, height: "38%" },
    { label: "자산", value: 455, height: "100%" },
    { label: "부채", value: 92, height: "58%" },
    { label: "자본", value: 363, height: "92%" },
  ].map((item) => (
    <div className="chart-column" key={item.label}>
      <div className="chart-value">{item.value}조</div>
      <div className="chart-bar-wrap">
        <div className="chart-bar" style={{ height: item.height }} />
      </div>
      <div className="chart-label">{item.label}</div>
    </div>
  ))}
</div>
          </article>

          <article className="card">
            <h2>AI 분석</h2>
            <p className="analysis-text">
              최근 실적 회복세와 반도체 업황 개선으로 중장기 성장 가능성이
              있습니다. 다만 단기 주가 변동성과 환율 리스크는 주의가 필요합니다.
            </p>
          </article>

          <article className="card">
            <h2>재무제표</h2>
            <ul className="metric-list">
              <li><span>자산총계</span><strong>455.9조</strong></li>
              <li><span>부채총계</span><strong>92.2조</strong></li>
              <li><span>자본총계</span><strong>363.7조</strong></li>
            </ul>
          </article>

          <article className="card">
            <h2>최신 뉴스</h2>
            <div className="news-item">
              <strong>AI 반도체 수요 증가 전망</strong>
              <span>2시간 전</span>
            </div>
            <div className="news-item">
              <strong>메모리 업황 회복 기대감 확대</strong>
              <span>5시간 전</span>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;