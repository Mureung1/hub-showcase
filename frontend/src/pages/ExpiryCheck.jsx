import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

const DEFAULT_EXPIRY = { onion: '2026-07-17', pork: '2026-07-10', tofu: '2026-07-13' };
const SHELF_LIFE_NOTE = { onion: '자동 설정 · 여름 기준 9일', pork: '자동 설정 · 냉장 2일', tofu: '자동 설정 · 개봉 전 5일' };
const EMOJI = { onion: '🧅', pork: '🥩', tofu: '🧊' };

function ddayLabel(isoDate) {
  const d = new Date(isoDate);
  return `~ ${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ExpiryCheck() {
  const { back, receipt, expiryOverrides, setExpiryOverride, confirmReceipt } = useApp();

  useEffect(() => {
    if (!receipt) return;
    receipt.items.filter((it) => it.matched && it.category === 'fresh' && DEFAULT_EXPIRY[it.matchedIngredientId]).forEach((it) => {
      if (!expiryOverrides[it.matchedIngredientId]) setExpiryOverride(it.matchedIngredientId, DEFAULT_EXPIRY[it.matchedIngredientId]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt]);

  if (!receipt) return null;
  const freshItems = receipt.items.filter((it) => it.matched && it.category === 'fresh');
  const processedItems = receipt.items.filter((it) => it.matched && it.category === 'processed');
  const matchedCount = receipt.items.filter((it) => it.matched).length;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>유통기한 확인</h1></div>
      <div className="content">
        <div className="notice">🌞 신선식품은 <b>여름철 평균 보관기간</b> 기준으로 자동 설정했어요. 날짜를 눌러서 수정할 수 있어요.</div>

        <div className="section-title">신선식품 — 자동 설정됨</div>
        {freshItems.map((it) => {
          const id = it.matchedIngredientId;
          const isoDate = expiryOverrides[id] || DEFAULT_EXPIRY[id] || '2026-07-15';
          return (
            <div className="row" key={id}>
              <div className="emoji">{EMOJI[id] || '🥬'}</div>
              <div className="info">
                <div className="name">{it.quantityLabel}</div>
                <div className="meta">{SHELF_LIFE_NOTE[id] || '자동 설정'}</div>
              </div>
              <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge green">{ddayLabel(isoDate)}</span>
                <input type="date" value={isoDate} onChange={(e) => setExpiryOverride(id, e.target.value)}
                  style={{ fontSize: 11, border: '1px solid var(--line)', borderRadius: 8, padding: '2px 4px', width: 112 }} />
              </div>
            </div>
          );
        })}

        {!!processedItems.length && (
          <>
            <div className="section-title">가공식품 — 직접 입력 (선택)</div>
            {processedItems.map((it) => (
              <div className="row" key={it.matchedIngredientId}>
                <div className="emoji">🥫</div>
                <div className="info"><div className="name">{it.quantityLabel}</div><div className="meta">가공식품은 입력하지 않아도 돼요</div></div>
                <div className="right"><span className="badge gray">＋ 입력</span></div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" onClick={confirmReceipt}>냉장고에 담기 ({matchedCount})</button>
      </div>
    </section>
  );
}
