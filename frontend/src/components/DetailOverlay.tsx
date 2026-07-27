import { useState } from 'react';
import { Drop } from '../App';

interface DetailOverlayProps {
  selectedDropId: string | null;
  setSelectedDropId: (id: string | null) => void;
  currentSelectedDrop?: Drop;
  castVote: (id: string, isUp: boolean, stakedPoints?: number) => void;
  userPoints?: number;
}

export default function DetailOverlay({
  selectedDropId,
  setSelectedDropId,
  currentSelectedDrop,
  castVote,
  userPoints = 1000,
}: DetailOverlayProps) {
  const [selectedStake, setSelectedStake] = useState<number>(100);

  const poly = currentSelectedDrop?.polymarket || {
    upPriceCent: '50¢',
    downPriceCent: '50¢',
    upOdds: '2.00x',
    downOdds: '2.00x',
    upPrice: 0.5,
    downPrice: 0.5,
    totalUpStaked: 0,
    totalDownStaked: 0,
    totalPot: 0,
  };

  const expectedUpPayout = Math.round(selectedStake * parseFloat(poly.upOdds));
  const expectedDownPayout = Math.round(selectedStake * parseFloat(poly.downOdds));

  // Compute Live Consensus Price based on UP/DOWN staked ratio
  const basePriceNum = currentSelectedDrop?.consensus || 100000;
  const sentimentOffset = (poly.upPrice - 0.5) * 0.3; // -15% ~ +15%
  const liveConsensusPrice = Math.round(basePriceNum * (1 + sentimentOffset));
  const sentimentChangePct = (sentimentOffset * 100).toFixed(1);

  // Real DB price histories (No fake mock data)
  const histories = currentSelectedDrop?.priceHistories || [];

  const maxPrice = histories.length > 0 ? Math.max(...histories.map((h) => h.price), liveConsensusPrice) : liveConsensusPrice;
  const minPrice = histories.length > 0 ? Math.min(...histories.map((h) => h.price), liveConsensusPrice) : liveConsensusPrice;
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className={`detail-overlay ${selectedDropId ? 'active' : ''}`} id="detail-panel">
      {currentSelectedDrop && (
        <div className="detail-content">
          <button className="btn-close" onClick={() => setSelectedDropId(null)}>
            &times;
          </button>
          <span className="detail-tag">{currentSelectedDrop.catLabel}</span>
          <h2 className="detail-title">{currentSelectedDrop.title}</h2>

          {/* Product image frame */}
          <div className="detail-img-container" style={{
            width: '100%',
            height: '180px',
            border: '2px solid #ffffff',
            background: '#111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginBottom: '16px',
            position: 'relative'
          }}>
            <img
              src={currentSelectedDrop.image}
              alt={currentSelectedDrop.title}
              referrerPolicy="no-referrer"
              style={{
                width: '90%',
                height: '90%',
                objectFit: 'contain',
                transition: 'all 0.3s ease'
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80';
              }}
            />
          </div>

          {/* 📈 3-Day Price History Trend Section */}
          <div style={{
            background: '#111111',
            border: '1px solid #333333',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontFamily: 'monospace', textTransform: 'lowercase' }}>
                📈 3-day price history (일별 시세 추이)
              </span>
              <span style={{ fontSize: '0.7rem', color: '#d4ff00', fontFamily: 'monospace' }}>
                daily interval
              </span>
            </div>

            {/* Price Trend Bar / Line Visualization */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '70px', padding: '8px 4px 0 4px', borderBottom: '1px solid #222222' }}>
              {histories.map((h, idx) => {
                const heightPct = Math.max(20, Math.min(100, ((h.price - minPrice) / priceRange) * 80 + 20));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', color: '#888888', marginBottom: '4px', fontFamily: 'monospace' }}>
                      {(h.price / 10000).toFixed(1)}만
                    </span>
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: idx === histories.length - 1 ? '#d4ff00' : '#444444',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: '0.65rem', color: '#aaaaaa', marginTop: '4px', fontFamily: 'monospace' }}>
                      {h.dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🔮 Polymarket Live Consensus Price Highlight */}
          <div style={{
            background: '#161616',
            border: '1px solid #d4ff00',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#aaaaaa', fontFamily: 'monospace' }}>
                🔮 LIVE CONSENSUS PRICE (실시간 합의 예상가)
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ffffff', fontFamily: 'monospace', marginTop: '2px' }}>
                {liveConsensusPrice.toLocaleString()} KRW
              </div>
            </div>
            <span style={{
              background: parseFloat(sentimentChangePct) >= 0 ? 'rgba(212, 255, 0, 0.15)' : 'rgba(255, 51, 51, 0.15)',
              border: `1px solid ${parseFloat(sentimentChangePct) >= 0 ? '#d4ff00' : '#ff3333'}`,
              color: parseFloat(sentimentChangePct) >= 0 ? '#d4ff00' : '#ff3333',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              fontFamily: 'monospace'
            }}>
              {parseFloat(sentimentChangePct) >= 0 ? '+' : ''}{sentimentChangePct}% {parseFloat(sentimentChangePct) >= 0 ? '▲' : '▼'}
            </span>
          </div>

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

          {/* Polymarket Share Pricing Card */}
          <div style={{
            background: '#1a1a1a',
            border: '2px solid #d4ff00',
            padding: '16px',
            marginTop: '10px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: '#d4ff00', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                🎰 Polymarket Live Shares
              </span>
              <span style={{ color: '#888888', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                보유 포인트: <strong style={{ color: '#ffffff' }}>{userPoints.toLocaleString()} pts</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#111111', padding: '10px', border: '1px solid #d4ff00', textAlign: 'center' }}>
                <div style={{ color: '#d4ff00', fontSize: '0.75rem', fontWeight: 'bold' }}>▲ UP Share Price</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffffff', margin: '4px 0' }}>{poly.upPriceCent}</div>
                <div style={{ color: '#888888', fontSize: '0.75rem' }}>배당: {poly.upOdds}</div>
              </div>
              <div style={{ background: '#111111', padding: '10px', border: '1px solid #ff3333', textAlign: 'center' }}>
                <div style={{ color: '#ff3333', fontSize: '0.75rem', fontWeight: 'bold' }}>▼ DOWN Share Price</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ffffff', margin: '4px 0' }}>{poly.downPriceCent}</div>
                <div style={{ color: '#888888', fontSize: '0.75rem' }}>배당: {poly.downOdds}</div>
              </div>
            </div>

            {/* Point Staking Amount Selector */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#aaaaaa', marginBottom: '8px' }}>매수 배팅 포인트 선택:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[100, 200, 500, 1000].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => setSelectedStake(pts)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      background: selectedStake === pts ? '#ffffff' : '#222222',
                      color: selectedStake === pts ? '#000000' : '#ffffff',
                      border: '1px solid #ffffff',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      borderRadius: '0px'
                    }}
                  >
                    {pts} pts
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Payout Breakdown */}
            <div style={{ fontSize: '0.75rem', color: '#888888', fontFamily: 'monospace', textAlign: 'center', marginTop: '12px' }}>
              적중 시 예상 환급금: <span style={{ color: '#d4ff00', fontWeight: 'bold' }}>UP +{expectedUpPayout} pts</span> / <span style={{ color: '#ff3333', fontWeight: 'bold' }}>DOWN +{expectedDownPayout} pts</span>
            </div>
          </div>

          <div className="vote-actions">
            <button className="btn-vote up" onClick={() => castVote(currentSelectedDrop.id, true, selectedStake)}>
              ▲ UP 매수 ({selectedStake} pts)
            </button>
            <button
              className="btn-vote down"
              onClick={() => castVote(currentSelectedDrop.id, false, selectedStake)}
            >
              ▼ DOWN 매수 ({selectedStake} pts)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
