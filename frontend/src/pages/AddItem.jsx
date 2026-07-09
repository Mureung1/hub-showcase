import { useState } from 'react';
import { useApp } from '../context/AppContext';

const UNIT_CHIPS = ['한단', '반단', '한쪽', '반쪽', '1/4쪽', '1알', 'g 직접입력'];

export default function AddItem() {
  const { back, tab, addFridgeItem } = useApp();
  const [name, setName] = useState('양파');
  const [unit, setUnit] = useState('한쪽');
  const [purchasedAt, setPurchasedAt] = useState('2026-07-08');
  const [expiryDate, setExpiryDate] = useState('2026-07-17');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await addFridgeItem({ name, quantityLabel: unit, purchasedAt, expiryDate });
    setSaving(false);
    tab('fridge');
  };

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>재료 직접 추가</h1></div>
      <div className="content">
        <div className="field">
          <label>재료명</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 양파" />
        </div>
        <div className="field">
          <label>수량 (실생활 단위)</label>
          <div className="unit-chips">
            {UNIT_CHIPS.map((u) => (
              <span key={u} className={`chip${unit === u ? ' on' : ''}`} onClick={() => setUnit(u)}>{u}</span>
            ))}
          </div>
        </div>
        <div className="field">
          <label>구매일</label>
          <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
        </div>
        <div className="field">
          <label>유통기한</label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          <div className="notice" style={{ marginTop: 8 }}>💡 신선식품은 구매일 기준 평균 유통기한이 자동 입력돼요 (여름철 기준 · 수정 가능)</div>
        </div>
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" disabled={saving || !name} onClick={handleSave}>
          {saving ? '추가하는 중…' : '냉장고에 추가'}
        </button>
      </div>
    </section>
  );
}
