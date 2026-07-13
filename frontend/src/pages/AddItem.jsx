import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ingredients, calcExpiryDate } from '../data/ingredients';

// "기타" 선택 시에만 쓰는 예전 자유입력용 일반 단위 칩 (마스터에 없는 재료라 defaultUnitLabels가 없음)
const OTHER_UNIT_CHIPS = ['한단', '반단', '한쪽', '반쪽', '1/4쪽', '1알', 'g 직접입력'];
const COMMON_INGREDIENT_IDS = ['onion', 'pa', 'tofu', 'egg', 'kimchi', 'pork', 'ramen'];
const COMMON_INGREDIENTS = ingredients.filter((ing) => COMMON_INGREDIENT_IDS.includes(ing.id));
const FRESH_QUANTITY_OPTIONS = {
  pork: ['근', 'g'],
  onion: ['개', '쪽'],
  pa: ['단'],
  tofu: ['모'],
  egg: ['알'],
  kimchi: ['통'],
};

function getQuantityUnits(id) {
  return FRESH_QUANTITY_OPTIONS[id] ?? ['개'];
}

export default function AddItem() {
  const { back, tab, addFridgeItem } = useApp();
  const [selectedId, setSelectedId] = useState(null); // null(미선택) | 'other' | 마스터 재료 id
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantityAmount, setQuantityAmount] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const isOther = selectedId === 'other';
  const master = isOther ? null : ingredients.find((i) => i.id === selectedId) ?? null;
  const isProcessed = master?.category === 'processed';
  const quantityUnits = master && !isProcessed ? getQuantityUnits(master.id) : null;
  const freshQuantityLabel = !isOther && master && !isProcessed && quantityAmount !== '' && quantityUnit
    ? `${quantityAmount}${quantityUnit}`
    : '';

  // 대표 재료를 고르면(기타 제외) 기본 단위와 수량을 초기화하고, 신선식품이면 유통기한 자동 계산
  useEffect(() => {
    if (!master) return;
    if (isProcessed) {
      setUnit('');
      setQuantityAmount('');
      setQuantityUnit('');
      setExpiryDate('');
    } else {
      const units = getQuantityUnits(master.id);
      setQuantityAmount('1');
      setQuantityUnit(units[0] ?? '');
      setExpiryDate(calcExpiryDate(master.id, purchasedAt) || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!master || isProcessed) return;
    setExpiryDate(calcExpiryDate(master.id, purchasedAt) || '');
  }, [purchasedAt, master, isProcessed]);

  useEffect(() => {
    if (isOther) {
      setUnit(OTHER_UNIT_CHIPS[2]);
      setName('');
      setExpiryDate('');
    }
  }, [isOther]);

  const isQuantityAmountValid = quantityAmount !== '' && !Number.isNaN(Number(quantityAmount));
  const canSave = isOther
    ? (name.trim() && unit.trim())
    : (master && (isProcessed ? unit.trim() : (isQuantityAmountValid && quantityUnit)));

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await addFridgeItem(
        isOther
          ? { name, quantityLabel: unit, purchasedAt, expiryDate }
          : { ingredientId: selectedId, quantityLabel: isProcessed ? unit : freshQuantityLabel, purchasedAt, expiryDate: expiryDate || undefined },
      );
      tab('fridge');
    } catch (err) {
      alert(err.message || '추가하는 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>재료 직접 추가</h1></div>
      <div className="content">
        <div className="field">
          <label>재료 선택</label>
          <div className="unit-chips">
            {COMMON_INGREDIENTS.map((ing) => (
              <span key={ing.id} className={`chip${selectedId === ing.id ? ' on' : ''}`} onClick={() => setSelectedId(ing.id)}>
                {ing.emoji} {ing.name}
              </span>
            ))}
            <span className={`chip${isOther ? ' on' : ''}`} onClick={() => setSelectedId('other')}>✏️ 기타(직접 입력)</span>
          </div>
        </div>

        {isOther && (
          <div className="field">
            <label>재료명</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 브로콜리" />
          </div>
        )}

        {(master || isOther) && (
          <div className="field">
            <label>수량 (실생활 단위)</label>
            {isProcessed ? (
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="예) 1병" />
            ) : isOther ? (
              <div className="unit-chips">
                {OTHER_UNIT_CHIPS.map((u) => (
                  <span key={u} className={`chip${unit === u ? ' on' : ''}`} onClick={() => setUnit(u)}>{u}</span>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {quantityUnits.map((u) => (
                    <button
                      key={u}
                      type="button"
                      className={`chip${quantityUnit === u ? ' on' : ''}`}
                      onClick={() => setQuantityUnit(u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-body)', borderRadius: '12px', padding: '0 16px', border: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quantityAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setQuantityAmount(val);
                    }}
                    placeholder="수량을 입력하세요"
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: '16px 0', fontSize: '1.1rem', outline: 'none', color: 'var(--text)' }}
                  />
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem', marginLeft: '8px' }}>{quantityUnit}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {(master || isOther) && (
          <>
            <div className="field">
              <label>구매일</label>
              <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </div>
            <div className="field">
              <label>유통기한{isProcessed && ' (선택)'}</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              {!isProcessed && (
                <div className="notice" style={{ marginTop: 8 }}>💡 신선식품은 구매일 기준 평균 유통기한이 자동 입력돼요 (여름철 기준 · 수정 가능)</div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" disabled={saving || !canSave} onClick={handleSave}>
          {saving ? '추가하는 중…' : '냉장고에 추가'}
        </button>
      </div>
    </section>
  );
}
