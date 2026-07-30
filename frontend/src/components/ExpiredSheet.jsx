import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { isExpired } from '../logic/fridgeLogic';
import Row from './Row';

// 냉장고가 갱신될 때마다(조리·추가·삭제 후 refreshFridge) 같은 경고가 다시 튀어나오면 조작을
// 방해하므로, 한 번 닫으면 그날 하루는 다시 띄우지 않는다. 날짜가 바뀌면 자연히 다시 뜬다.
const DISMISS_KEY = 'expiredAlertDismissedOn';
const todayKey = () => new Date().toISOString().slice(0, 10);

// 재료 단위가 아니라 구매 내역 단위로 모은다 — 같은 재료라도 어제 산 건 멀쩡하고 지난주에 산 것만
// 상했을 수 있어서, 재료 하나를 통째로 버리라고 하면 안 된다.
function expiredEntriesOf(fridge) {
  return Object.values(fridge).flatMap((f) =>
    (f.items ?? []).filter((item) => isExpired(item.expiry)).map((item) => ({
      key: item.dbId ?? `${f.id}_${item.purchased}`,
      emoji: f.emoji,
      name: f.name,
      qty: item.qtyAmount !== undefined ? `${item.qtyAmount}${item.qtyUnit ?? ''}` : item.qtyLabel,
      purchased: item.purchased,
      expiry: item.expiry,
    })));
}

export default function ExpiredSheet() {
  const { fridge, refreshFridge } = useApp();
  const [dismissedOn, setDismissedOn] = useState(() => localStorage.getItem(DISMISS_KEY));
  const [discarding, setDiscarding] = useState(false);

  const expired = expiredEntriesOf(fridge);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, todayKey());
    setDismissedOn(todayKey());
  };

  // 버린 뒤엔 따로 닫지 않는다 — 목록이 비면 알아서 사라지고, 일부가 안 지워졌다면
  // 그건 계속 보여주는 게 맞다. 여기서 dismiss()까지 하면 오늘 새로 상한 재료도 묻혀버린다.
  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      await api.discardExpiredItems();
      await refreshFridge();
    } catch (err) {
      alert(err.message || '버리는 중 오류가 발생했어요.');
    } finally {
      setDiscarding(false);
    }
  };

  if (!expired.length || dismissedOn === todayKey()) return null;

  return (
    <div className="sheet-dim open" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="sheet">
        <div className="grip" />
        <h2>🗑 유통기한이 지났어요</h2>
        <div className="tipbox" style={{ background: 'var(--red-light)' }}>
          아래 <b>{expired.length}건</b>은 유통기한이 지났어요. 드시지 말고 버려 주세요.
        </div>
        <div style={{ marginTop: 8 }}>
          {expired.map((e) => (
            <Row key={e.key} emoji={e.emoji} name={`${e.name} ${e.qty}`} nameColor="var(--red)"
              meta={`${e.purchased} 구매`} right={<span className="badge red">{e.expiry}</span>} />
          ))}
        </div>
        <div className="btn-row" style={{ marginTop: 18 }}>
          <button className="btn ghost" onClick={dismiss} disabled={discarding}>나중에</button>
          <button className="btn gray" onClick={handleDiscard} disabled={discarding}>
            {discarding ? '버리는 중…' : '버렸어요'}
          </button>
        </div>
      </div>
    </div>
  );
}
