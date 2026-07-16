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

interface DetailOverlayProps {
  selectedDropId: string | null;
  setSelectedDropId: (id: string | null) => void;
  currentSelectedDrop?: Drop;
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

export default function DetailOverlay({
  selectedDropId,
  setSelectedDropId,
  currentSelectedDrop,
  castVote,
}: DetailOverlayProps) {
  return (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="val white-text">{currentSelectedDrop.marketPrice}</span>
                    {currentSelectedDrop.priceChangeRate !== undefined && currentSelectedDrop.priceChangeRate !== null && (
                      <span style={{
                        background: currentSelectedDrop.priceChangeRate >= 0 ? '#d4ff00' : '#ff3333',
                        color: '#000000',
                        fontSize: '0.8rem',
                        padding: '2px 6px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}>
                        {currentSelectedDrop.priceChangeRate >= 0 ? '+' : ''}{currentSelectedDrop.priceChangeRate.toFixed(1)}% {currentSelectedDrop.priceChangeRate >= 0 ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Global Sneaker Database Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
            {currentSelectedDrop.status === 'upcoming' ? (
              <>
                <div className="price-box">
                  <span className="label">공식 출시일 (release date)</span>
                  <span className="val white-text" style={{ fontSize: '1rem' }}>
                    {currentSelectedDrop.releaseDate ? new Date(currentSelectedDrop.releaseDate).toLocaleDateString() : 'tbd'}
                  </span>
                </div>
                <div className="price-box">
                  <span className="label">남은 기간 (countdown)</span>
                  <span className="val accent-text" style={{ fontSize: '1rem' }}>
                    {getDDay(currentSelectedDrop.releaseDate) || 'tbd'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="price-box">
                  <span className="label">누적 거래량 (volume)</span>
                  <span className="val white-text" style={{ fontSize: '1rem' }}>
                    {currentSelectedDrop.volume ? `${currentSelectedDrop.volume.toLocaleString()}건` : 'n/a'}
                  </span>
                </div>
                <div className="price-box">
                  <span className="label">변동 등락률 (change)</span>
                  <span className="val" style={{ fontSize: '1rem', color: (currentSelectedDrop.priceChangeRate || 0) >= 0 ? '#d4ff00' : '#ff3333' }}>
                    {(currentSelectedDrop.priceChangeRate || 0) >= 0 ? '+' : ''}{(currentSelectedDrop.priceChangeRate || 0).toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Sparkline chart */}
          <div className="chart-container">
            <h4 className="chart-label">시세 변동 추이 (sparkline)</h4>
            <svg className="sparkline-chart" viewBox="0 0 300 100">
              <path d={currentSelectedDrop.sparkline} fill="none" stroke="#d4ff00" strokeWidth="3" />
              <circle cx="300" cy="10" r="5" fill="#d4ff00" />
            </svg>
          </div>

          {/* Sentiment meter */}
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
        </div>
      )}
    </div>
  );
}
