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
  releaseDate?: string;
  releaseDateText?: string;
  priceChangeRate?: number;
  volume?: number;
}

interface DropsGridProps {
  activeTab: 'upcoming' | 'released' | 'ranking';
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  filteredDrops: Drop[];
  setSelectedDropId: (id: string | null) => void;
  castVote: (id: string, isUp: boolean) => void;
}

// Helper to calculate D-Day countdown inside the component scope
const getDDay = (dateStr?: string) => {
  if (!dateStr) return null;
  const release = new Date(dateStr);
  const today = new Date();
  release.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = release.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'd-day';
  if (diffDays < 0) return `released ${Math.abs(diffDays)}d ago`;
  return `d-${diffDays}`;
};

export default function DropsGrid({
  activeTab,
  activeCategory,
  setActiveCategory,
  filteredDrops,
  setSelectedDropId,
  castVote,
}: DropsGridProps) {
  if (activeTab === 'ranking') return null;

  return (
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

      <div className="sub-filters" style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {(['all', 'sneakers', 'streetwear', 'tcg', 'accessories', 'collectibles'] as const).map((cat) => {
          const labelMap: Record<string, string> = {
            all: 'all items',
            sneakers: 'sneakers 👟',
            streetwear: 'wear 👕',
            tcg: 'tcg 🃏',
            accessories: 'accessories 🎒',
            collectibles: 'collectibles 🧱',
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
              className={`drop-card ${drop.status} ${drop.bullish > 70 && isUpcoming ? 'bullish-heavy' : ''}`}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'BUTTON') {
                  setSelectedDropId(drop.id);
                }
              }}
            >
              <div className="card-top">
                <span className="card-tag">{drop.catLabel}</span>
                <span className={`status-badge ${drop.status}`}>
                  {isUpcoming ? (getDDay(drop.releaseDate) || drop.status) : drop.status}
                </span>
              </div>

              <div className="card-img-container">
                <img
                  src={drop.image}
                  alt={drop.title}
                  className="card-img"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80';
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
                    <span className="card-retail">
                      retail: {drop.retail} // date: {drop.releaseDateText || 'tbd'}
                    </span>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span className="card-consensus market-accent">
                        market. {drop.marketPrice}
                      </span>
                      {drop.priceChangeRate !== undefined && drop.priceChangeRate !== null && (
                        <span style={{
                          background: drop.priceChangeRate >= 0 ? '#d4ff00' : '#ff3333',
                          color: '#000000',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          borderRadius: '0px',
                          textTransform: 'lowercase'
                        }}>
                          {drop.priceChangeRate >= 0 ? '+' : ''}{drop.priceChangeRate.toFixed(1)}% {drop.priceChangeRate >= 0 ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      <span>retail: {drop.retail}</span>
                      {drop.volume && <span>vol: {drop.volume.toLocaleString()}</span>}
                    </div>
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
                <button className="btn-vote-mini up" onClick={() => castVote(drop.id, true)}>
                  ▲ up
                </button>
                <button className="btn-vote-mini down" onClick={() => castVote(drop.id, false)}>
                  ▼ down
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
