import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { calcExpiryDate, ingredientMap } from '../data/ingredients';

const EMOJI = { onion: '🧅', pork: '🥩', tofu: '🧊' };

function ddayLabel(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return `~ ${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ExpiryCheck() {
  const { back, receipt, expiryOverrides, setExpiryOverride, confirmReceipt } = useApp();
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await confirmReceipt();
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (!receipt) return;
    receipt.items.filter((it) => it.matched && it.category === 'fresh').forEach((it) => {
      const id = it.matchedIngredientId;
      const defaultExp = calcExpiryDate(id, receipt.date.replace(/\./g, '-')) || '2026-07-15';
      if (!expiryOverrides[id]) setExpiryOverride(id, defaultExp);
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
          const master = ingredientMap[id];
          const isoDate = expiryOverrides[id] || calcExpiryDate(id, receipt.date.replace(/\./g, '-')) || '2026-07-15';
          const season = '여름'; // getSeason 로직을 써도 되지만 간략히
          const days = master?.avgShelfLifeDays?.summer;
          const note = days ? `자동 설정 · ${season} 기준 ${days}일` : '자동 설정';
          return (
            <div className="row" key={id}>
              <div className="emoji">{EMOJI[id] || master?.emoji || '🥬'}</div>
              <div className="info">
                <div className="name">{it.quantityLabel}</div>
                <div className="meta">{note}</div>
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
            {processedItems.map((it) => {
              const id = it.matchedIngredientId;
              const isoDate = expiryOverrides[id] || '';
              return (
                <div className="row" key={id}>
                  <div className="emoji">{ingredientMap[id]?.emoji || '🥫'}</div>
                  <div className="info"><div className="name">{it.quantityLabel}</div><div className="meta">가공식품은 입력하지 않아도 돼요</div></div>
                  <div className="right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isoDate ? <span className="badge green">{ddayLabel(isoDate)}</span> : <span className="badge gray">＋ 입력</span>}
                    <input type="date" value={isoDate} onChange={(e) => setExpiryOverride(id, e.target.value)}
                      style={{ fontSize: 11, border: '1px solid var(--line)', borderRadius: 8, padding: '2px 4px', width: 112 }} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" disabled={confirming} onClick={handleConfirm}>
          {confirming ? '담는 중…' : `냉장고에 담기 (${matchedCount})`}
        </button>
      </div>
    </section>
  );
}
