import { useState, useEffect } from 'react';
import { MOCK_RANKINGS } from './mockData';

// 1. Core Interfaces
interface Drop {
  id: string;
  title: string;
  category: string;
  catLabel: string;
  status: 'upcoming' | 'released';
  retail: string;
  consensus: number;
  marketPrice?: string;
  bullish: number;
  image: string;
  sparkline: string;
}

interface ToastMessage {
  id: string;
  message: string;
}

export default function App() {
  // 3. States
  const [activeTab, setActiveTab] = useState<'upcoming' | 'released' | 'ranking'>('upcoming');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [drops, setDrops] = useState<Drop[]>([]);
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  const [rankingPeriod, setRankingPeriod] = useState<'current' | 'last'>('current');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const API_BASE = 'http://localhost:5000/api';
  const TEST_USER_ID = '64700eed-4e7e-4a57-b75b-7e81f999caaa';

  // Fetch Drops from Backend
  const fetchDrops = async () => {
    try {
      const res = await fetch(`${API_BASE}/drops`);
      const result = await res.json();
      if (result.success) {
        // Map backend Drop schema to frontend Drop interface
        const mapped: Drop[] = result.data.map((d: any) => {
          const catLabels: Record<string, string> = {
            sneakers: 'sneakers 👟',
            streetwear: 'streetwear 👕',
            tcg: 'tcg/toys 🃏',
            lego: 'lego 🧱'
          };

          // Image mappings based on brand or title for premium aesthetics
          let image = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80';
          if (d.brand === 'Nike') image = 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&q=80';
          else if (d.brand === 'Adidas') image = 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80';
          else if (d.brand === 'Asics') image = 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80';
          else if (d.brand === 'Salomon') image = 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80';
          else if (d.category === 'tcg') image = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&q=80';

          return {
            id: d.id,
            title: d.title.toLowerCase(),
            category: d.category,
            catLabel: catLabels[d.category] || d.category,
            status: d.status.toLowerCase(),
            retail: `${d.retailPrice.toLocaleString()} KRW`,
            consensus: d.consensusPrice || Math.round(d.retailPrice * 1.15),
            marketPrice: d.marketPrice ? `${d.marketPrice.toLocaleString()} KRW` : undefined,
            // Derive a mockup bullish percentage based on title characters for visual styling
            bullish: Math.abs(d.title.charCodeAt(0) % 30) + 65,
            image,
            sparkline: d.category === 'sneakers'
              ? 'M 0 85 C 50 60, 100 40, 150 25 C 200 20, 250 15, 300 10'
              : 'M 0 50 C 50 50, 100 60, 150 55 C 200 45, 250 52, 300 48'
          };
        });
        setDrops(mapped);
      }
    } catch (error) {
      console.error('Error fetching drops:', error);
    }
  };

  useEffect(() => {
    fetchDrops();
  }, []);

  // 4. Effects
  useEffect(() => {
    // Mouse Glow Variable Bindings
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update body class for editorial visibility toggling
  useEffect(() => {
    if (activeTab === 'upcoming' && activeCategory === 'all') {
      document.body.classList.remove('hide-editorial');
    } else {
      document.body.classList.add('hide-editorial');
    }
  }, [activeTab, activeCategory]);

  // 5. Action Handlers
  const showToast = (message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const castVote = async (id: string, isUp: boolean) => {
    const item = drops.find((d) => d.id === id);
    if (!item || item.status === 'released') return;

    try {
      const res = await fetch(`${API_BASE}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          dropId: id,
          direction: isUp ? 'UP' : 'DOWN'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(
          isUp
            ? `[▲ 오를까] 투표완료 // 예상 리셀가가 상승했습니다.`
            : `[▼ 내릴까] 투표완료 // 예상 리셀가가 하락했습니다.`
        );
        // Refresh drops list
        await fetchDrops();
      } else {
        // Show error message (e.g. lock-in policy block)
        showToast(`[오류] ${result.message || '투표 제출에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      showToast('[오류] 서버와의 통신에 실패했습니다.');
    }
  };

  const currentSelectedDrop = drops.find((d) => d.id === selectedDropId);

  // Filter items by tab status and sub category
  const filteredDrops = drops.filter((d) => {
    if (activeTab === 'upcoming' && d.status !== 'upcoming') return false;
    if (activeTab === 'released' && d.status !== 'released') return false;
    if (activeCategory !== 'all' && d.category !== activeCategory) return false;
    return true;
  });

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        based on crowd consensus // forecasting next week's alternative drops // version 1.0.0
      </div>

      {/* GNB Header */}
      <header>
        <a
          href="#"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('upcoming');
            setActiveCategory('all');
          }}
        >
          dropcast*
        </a>

        <nav className="nav-filters">
          {(['upcoming', 'released', 'ranking'] as const).map((tab) => {
            const labelMap: Record<string, string> = {
              upcoming: 'upcoming 🗳️',
              released: 'hot & released 📈',
              ranking: 'ranking 🏆',
            };
            return (
              <a
                key={tab}
                href="#"
                className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab);
                  setActiveCategory('all');
                }}
              >
                {labelMap[tab]}
              </a>
            );
          })}
        </nav>

        <a
          href="#active-drops"
          className="btn-touch"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('active-drops');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          predict drops
        </a>
      </header>

      {/* 1. Hero Collage (Only upcoming and 'all') */}
      {activeTab === 'upcoming' && activeCategory === 'all' && (
        <section className="hero-section">
          <div className="hero-meta-label">
            main / <span className="accent-text">about us</span>
          </div>

          <div className="hero-title-container">
            <img src="/artist_bw.png" alt="Artist B&W" className="floating-img img-left" />
            <img src="/tunnel_green.png" alt="Model Green Tunnel" className="floating-img img-center" />
            <h1 className="hero-title">
              predict
              <br />
              next
            </h1>
          </div>

          <div className="hero-footer">
            <div className="plus-icon">[+]</div>
            <p className="location-text">based in seoul, analyzing global markets</p>
            <div className="vertical-line"></div>
          </div>
        </section>
      )}

      {/* 2. Core Statement Section (Only upcoming and 'all') */}
      {activeTab === 'upcoming' && activeCategory === 'all' && (
        <section className="statement-section">
          <p className="statement-text">
            we are a crowdsourced consensus engine forecasting the future value of alternative assets before they hit the market.
          </p>

          <div className="statement-sub">
            <p>
              돈은 없지만 관심은 많은 대학생과 컬렉터들을 위해 가상 포인트로 한정판의 발매가와 리셀 시세를 예측하고 집단지성을 구축합니다.
            </p>
            <p>
              도박이나 베팅의 위험 없이, 순수한 의견 제출과 빅데이터 연산 엔진을 통해 차세대 자산군의 가격 지표를 3초 만에 시각화해 줍니다.
            </p>
          </div>
        </section>
      )}

      {/* 3. Timeline Curves Section (Only upcoming and 'all') */}
      {activeTab === 'upcoming' && activeCategory === 'all' && (
        <section className="process-section">
          <div className="process-bg-line">
            <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path
                d="M 200,0 C 200,150 350,180 200,320 C 50,450 100,520 250,650 C 350,750 200,780 200,800"
                stroke="#d4ff00"
                strokeWidth="2"
                strokeDasharray="1000"
                strokeDashoffset="0"
                id="path-guide"
              />
            </svg>
          </div>

          <div className="process-container">
            <div className="process-step step-left" style={{ top: '10%' }}>
              <div className="step-num">01.</div>
              <div className="step-content">
                <h3 className="step-title">&bull; forecast</h3>
                <p className="step-desc">발매 전 한정판 스니커즈와 수집품 카드를 보고 3초 만에 업/다운 예측 투표를 진행합니다.</p>
              </div>
            </div>

            <div className="process-step step-right" style={{ top: '32%' }}>
              <div className="step-num">02.</div>
              <div className="step-content">
                <h3 className="step-title">o drop</h3>
                <p className="step-desc">금요일 오전 실제 시장에 오프라인/온라인 한정판 드롭이 개시되며 투표는 공식 잠금 처리됩니다.</p>
              </div>
            </div>

            <div className="process-step step-left" style={{ top: '55%' }}>
              <div className="step-num">03.</div>
              <div className="step-content">
                <h3 className="step-title">o market tracking</h3>
                <p className="step-desc">발매 주말 동안 KREAM, StockX 등의 실제 체결가를 크롤링하여 주말 공식 종가 데이터를 확정합니다.</p>
              </div>
            </div>

            <div className="process-step step-right" style={{ top: '78%' }}>
              <div className="step-num">04.</div>
              <div className="step-content">
                <h3 className="step-title">o reward & rank</h3>
                <p className="step-desc">예측 방향이 적중한 유저에게 스코어를 부여하고, 주간 전광판 랭커에게 경품 리워드를 순차 자동 지급합니다.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Active Drops Grid (Show when tab is NOT ranking) */}
      {activeTab !== 'ranking' && (
        <section className="drops-section" id="active-drops">
          <div className="drops-header">
            <h2 className="section-title">
              {activeTab === 'upcoming' ? 'upcoming drops' : 'hot & released'}
            </h2>
            <p className="section-subtitle">
              {activeTab === 'upcoming' 
                ? '출시 전 한정판 라인업입니다. 가격 상승/하락 예측 투표에 참여해 집단지성을 형성해보세요.' 
                : '발매 완료되어 실시간으로 거래 시세를 추적 중인 상품군입니다.'}
            </p>
          </div>

          {/* Sub category filter chips inside the tab */}
          <div className="sub-filters" style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {(['all', 'sneakers', 'streetwear', 'tcg', 'lego'] as const).map((cat) => {
              const labelMap: Record<string, string> = {
                all: 'all items',
                sneakers: 'sneakers 👟',
                streetwear: 'wear 👕',
                tcg: 'tcg 🃏',
                lego: 'lego 🧱',
              };
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className={`filter-tab-mini ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: isSelected ? '#d4ff00' : 'transparent',
                    color: isSelected ? '#000000' : '#ffffff',
                    border: '1px solid #ffffff',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    textTransform: 'lowercase',
                    borderRadius: '0px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {labelMap[cat]}
                </button>
              );
            })}
          </div>

          <div className="drops-grid">
            {filteredDrops.map((drop) => {
              const isUpcoming = drop.status === 'upcoming';
              return (
                <div
                  key={drop.id}
                  className={`drop-card ${drop.status} ${drop.bullish > 70 && isUpcoming ? 'bullish-heavy' : ''
                    }`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName !== 'BUTTON') {
                      setSelectedDropId(drop.id);
                    }
                  }}
                >
                  <div className="card-top">
                    <span className="card-tag">{drop.catLabel}</span>
                    <span className={`status-badge ${drop.status}`}>{drop.status}</span>
                  </div>

                  <div className="card-img-container">
                    <img
                      src={drop.image}
                      alt={drop.title}
                      className="card-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
                      }}
                    />
                  </div>

                  <h3 className="card-title">{drop.title}</h3>

                  <div className="card-pricing">
                    {isUpcoming ? (
                      <>
                        <span className="card-consensus">
                          est. {drop.consensus.toLocaleString()} KRW
                        </span>
                        <span className="card-retail">retail: {drop.retail}</span>
                      </>
                    ) : (
                      <>
                        <span className="card-consensus market-accent">
                          market. {drop.marketPrice}
                        </span>
                        <span className="card-retail">retail: {drop.retail}</span>
                      </>
                    )}
                  </div>

                  <div className="card-sparkline">
                    <svg viewBox="0 0 300 50">
                      <path d={drop.sparkline} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      <path
                        d={drop.sparkline}
                        fill="none"
                        stroke={isUpcoming ? '#d4ff00' : '#888888'}
                        strokeWidth="2"
                        className="sparkline-fill"
                      />
                    </svg>
                  </div>

                  <div className="card-actions">
                    {isUpcoming ? (
                      <>
                        <button className="btn-vote-mini up" onClick={() => castVote(drop.id, true)}>
                          ▲ up
                        </button>
                        <button className="btn-vote-mini down" onClick={() => castVote(drop.id, false)}>
                          ▼ down
                        </button>
                      </>
                    ) : (
                      <div className="locked-status">🔒 voting locked (released)</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Leaderboard Weekly Rankings (Show when tab IS ranking) */}
      {activeTab === 'ranking' && (
        <section className="ranking-section" id="ranking-dashboard">
          <div className="ranking-header">
            <h2 className="section-title">weekly leaderboard</h2>
            <div className="ranking-controls">
              <button
                className={`btn-rank-toggle ${rankingPeriod === 'current' ? 'active' : ''}`}
                onClick={() => {
                  setRankingPeriod('current');
                  showToast('this week 주간 랭킹 정보로 전환되었습니다.');
                }}
              >
                this week
              </button>
              <button
                className={`btn-rank-toggle ${rankingPeriod === 'last' ? 'active' : ''}`}
                onClick={() => {
                  setRankingPeriod('last');
                  showToast('last week 주간 랭킹 정보로 전환되었습니다.');
                }}
              >
                last week
              </button>
            </div>
          </div>

          <div className="ranking-content">
            {/* Left Podium (1st, 2nd, 3rd) */}
            <div className="podium-container">
              {/* Rank 1 Card */}
              <div className="podium-card rank-1">
                <div className="podium-top-badge">
                  <span className="card-tag">gold standard</span>
                  <span className="status-badge upcoming">rank #01</span>
                </div>

                <div className="user-profile">
                  <div className="user-avatar">{MOCK_RANKINGS[rankingPeriod].podium[0].avatar}</div>
                  <div className="user-info">
                    <span className="username">{MOCK_RANKINGS[rankingPeriod].podium[0].name}</span>
                    <span className="user-reward-label">weekly prize</span>
                    <span className="user-reward accent-text">
                      {MOCK_RANKINGS[rankingPeriod].podium[0].reward}
                    </span>
                  </div>
                </div>

                <div className="podium-stats">
                  <div className="stat-box">
                    <span className="stat-label">accuracy</span>
                    <span className="stat-val accent-text">
                      {MOCK_RANKINGS[rankingPeriod].podium[0].accuracy}
                    </span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">accumulated points</span>
                    <span className="stat-val">
                      {MOCK_RANKINGS[rankingPeriod].podium[0].points}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rank 2 & 3 Subgrid */}
              <div className="podium-sub-row">
                {/* Rank 2 */}
                <div className="podium-card rank-2">
                  <div className="podium-top-badge">
                    <span className="card-tag">contender</span>
                    <span className="status-badge released">rank #02</span>
                  </div>

                  <div className="user-profile small">
                    <div className="user-avatar">{MOCK_RANKINGS[rankingPeriod].podium[1].avatar}</div>
                    <div className="user-info">
                      <span className="username">{MOCK_RANKINGS[rankingPeriod].podium[1].name}</span>
                      <span className="user-reward">
                        {MOCK_RANKINGS[rankingPeriod].podium[1].reward}
                      </span>
                    </div>
                  </div>

                  <div className="podium-stats">
                    <div className="stat-box">
                      <span className="stat-label">accuracy</span>
                      <span className="stat-val accent-text">
                        {MOCK_RANKINGS[rankingPeriod].podium[1].accuracy}
                      </span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">points</span>
                      <span className="stat-val">
                        {MOCK_RANKINGS[rankingPeriod].podium[1].points}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="podium-card rank-3">
                  <div className="podium-top-badge">
                    <span className="card-tag">contender</span>
                    <span className="status-badge released">rank #03</span>
                  </div>

                  <div className="user-profile small">
                    <div className="user-avatar">{MOCK_RANKINGS[rankingPeriod].podium[2].avatar}</div>
                    <div className="user-info">
                      <span className="username">{MOCK_RANKINGS[rankingPeriod].podium[2].name}</span>
                      <span className="user-reward">
                        {MOCK_RANKINGS[rankingPeriod].podium[2].reward}
                      </span>
                    </div>
                  </div>

                  <div className="podium-stats">
                    <div className="stat-box">
                      <span className="stat-label">accuracy</span>
                      <span className="stat-val accent-text">
                        {MOCK_RANKINGS[rankingPeriod].podium[2].accuracy}
                      </span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">points</span>
                      <span className="stat-val">
                        {MOCK_RANKINGS[rankingPeriod].podium[2].points}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contenders List */}
            <div className="rank-list-container">
              <h3 className="list-title">top contenders (rank 04 - 10)</h3>

              <div className="rank-list">
                {MOCK_RANKINGS[rankingPeriod].list.map((item) => {
                  let trendIndicator = '•';
                  let trendClass = 'trend-same';
                  if (item.trend === 'up') {
                    trendIndicator = '▲';
                    trendClass = 'trend-up';
                  } else if (item.trend === 'down') {
                    trendIndicator = '▼';
                    trendClass = 'trend-down';
                  }

                  return (
                    <div key={item.rank} className="rank-list-row">
                      <span className="row-rank">{item.rank}</span>
                      <span className="row-name">{item.name}</span>
                      <span className="row-acc accent-text">{item.accuracy}</span>
                      <span className="row-points">{item.points}</span>
                      <span className={`row-trend ${trendClass}`}>{trendIndicator}</span>
                    </div>
                  );
                })}
              </div>

              {/* Standing Info Widget */}
              <div className="my-rank-card">
                <div className="my-rank-header-box">
                  <span className="my-rank-label">your standing</span>
                  <span className="my-rank-val">rank #14 // @youngmin</span>
                </div>

                <div className="my-rank-stats-grid">
                  <div className="my-stat">
                    <span className="label">my accuracy</span>
                    <span className="val accent-text">91.8%</span>
                  </div>
                  <div className="my-stat">
                    <span className="label">total points</span>
                    <span className="val">8,450 pts</span>
                  </div>
                </div>

                <div className="my-rank-footer">
                  <span>
                    you need <strong className="accent-text">+450 pts</strong> to enter top 10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Detail Overlay Panel */}
      <div className={`detail-overlay ${selectedDropId ? 'active' : ''}`} id="detail-panel">
        {currentSelectedDrop && (
          <div className="detail-content">
            <button className="btn-close" onClick={() => setSelectedDropId(null)}>
              &times;
            </button>
            <span className="detail-tag">{currentSelectedDrop.catLabel}</span>
            <h2 className="detail-title">{currentSelectedDrop.title}</h2>

            <div className="detail-pricing">
              <div className="price-box">
                <span className="label">정가 (retail)</span>
                <span className="val">{currentSelectedDrop.retail}</span>
              </div>
              <div className="price-box highlight">
                {currentSelectedDrop.status === 'upcoming' ? (
                  <>
                    <span className="label">대중 합의 예상가 (consensus)</span>
                    <span className="val accent-text">
                      {currentSelectedDrop.consensus.toLocaleString()} KRW
                    </span>
                  </>
                ) : (
                  <>
                    <span className="label">현재 거래 시세 (market)</span>
                    <span className="val white-text">{currentSelectedDrop.marketPrice}</span>
                  </>
                )}
              </div>
            </div>

            {/* Sparkline chart */}
            <div className="chart-container">
              <h4 className="chart-label">시세 변동 추이 (sparkline)</h4>
              <svg className="sparkline-chart" viewBox="0 0 300 100">
                <path d={currentSelectedDrop.sparkline} fill="none" stroke="#d4ff00" strokeWidth="3" />
                <circle cx="300" cy="10" r="5" fill="#d4ff00" />
              </svg>
            </div>

            {/* Sentiment meter (Upcoming only) */}
            {currentSelectedDrop.status === 'upcoming' && (
              <>
                <div className="detail-sentiment">
                  <div className="sentiment-bar-label">
                    <span>
                      bullish (▲) <strong>{currentSelectedDrop.bullish}%</strong>
                    </span>
                    <span>
                      bearish (▼) <strong>{100 - currentSelectedDrop.bullish}%</strong>
                    </span>
                  </div>
                  <div className="sentiment-bar-track">
                    <div
                      className="sentiment-bar-fill"
                      style={{ width: `${currentSelectedDrop.bullish}%` }}
                    ></div>
                  </div>
                </div>

                <div className="vote-actions">
                  <button className="btn-vote up" onClick={() => castVote(currentSelectedDrop.id, true)}>
                    ▲ 오를까
                  </button>
                  <button
                    className="btn-vote down"
                    onClick={() => castVote(currentSelectedDrop.id, false)}
                  >
                    ▼ 내릴까
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 7. Toast Alerts container */}
      {toasts.length > 0 && (
        <div className="toasts-container" style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 3000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {toasts.map((toast) => (
            <div key={toast.id} className="toast-alert show" style={{ position: 'relative', bottom: '0', left: '0', transform: 'none' }}>
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <footer>
        <p>&copy; 2026 dropcast* all rights reserved.</p>
        <p>본 사이트는 크라우드소싱 기반 시세 예측 적합성 검증을 위한 데모 페이지입니다.</p>
        <div className="footer-links">
          <a href="/git_wiki_planning.md" target="_blank" rel="noreferrer">
            git_wiki_planning.md
          </a>
          <a href="/AGENTS.md" target="_blank" rel="noreferrer">
            AGENTS.md
          </a>
        </div>
      </footer>
    </>
  );
}
