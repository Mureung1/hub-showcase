import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { calcExpiryDate } from '../data/ingredients';
import { useAsyncData } from '../hooks/useAsyncData';

// "기타" 선택 시에만 쓰는 예전 자유입력용 일반 단위 칩 (마스터에 없는 재료라 defaultUnitLabels가 없음)
const OTHER_UNIT_CHIPS = ['한단', '반단', '한쪽', '반쪽', '1/4쪽', '1알', 'g 직접입력'];

const SUB_CATEGORIES = [
  {
    name: '채소류 🧅',
    ids: ['onion', 'pa', 'garlic', 'potato', 'carrot', 'cabbage', 'pepper', 'chili', 'mushroom', 'cucumber', 'zucchini', 'beanSprouts', 'spinach', 'radish', 'lettuce', 'sesameLeaf', 'ginger', 'scallion', 'broccoli', 'eggplant', 'bellPepper', 'enoki', 'oysterMushroom', 'sweetPotato', 'chives']
  },
  {
    name: '육류/가금류 🥩',
    ids: ['pork', 'porkBelly', 'beef', 'beefMinced', 'chicken', 'chickenBreast', 'bacon']
  },
  {
    name: '수산물/해물 🦑',
    ids: ['squid', 'seafoodMix', 'shrimp', 'clam', 'anchovy', 'pollack', 'kelp']
  },
  {
    name: '유제품/알/두부 🥛',
    ids: ['egg', 'tofu', 'milk', 'butter', 'cheese', 'mozzarella']
  },
  {
    name: '곡류/면류 🍚',
    ids: ['rice', 'ramen', 'somyeon', 'ricecake', 'glassNoodle']
  },
  {
    name: '양념/조미료 🧂',
    ids: ['soy', 'salt', 'sugar', 'sesameOil', 'gochugaru', 'gochujang', 'doenjang', 'garlicMinced', 'oil', 'vinegar', 'pepperPowder', 'cookingWine', 'oysterSauce', 'plumSyrup', 'cornSyrup', 'honey', 'mayonnaise', 'ketchup', 'ssamjang', 'mustard']
  },
  {
    name: '가공식품/기타 🥫',
    ids: ['spam', 'tunaCan', 'sausage', 'dumpling', 'pancakeMix', 'curryPowder', 'seaweed', 'driedLaver', 'crabStick', 'fishCake', 'cheeseStick', 'udong', 'pastaNoodle', 'porkCutlet', 'spicyPork', 'tokkboki', 'soupPack', 'chickenNugget', 'bread']
  }
];

function getQuantityUnits(id) {
  const unitsMap = {
    pork: ['근', 'g'],
    porkBelly: ['근', 'g'],
    beef: ['근', 'g'],
    beefMinced: ['g'],
    chicken: ['마리'],
    chickenBreast: ['g', '개'],
    bacon: ['g', '개'],
    squid: ['마리'],
    seafoodMix: ['g', '봉'],
    shrimp: ['마리', 'g'],
    clam: ['봉', 'g'],
    anchovy: ['봉', 'g'],
    pollack: ['봉', 'g'],
    kelp: ['봉', 'g'],
    egg: ['알', '개'],
    tofu: ['모', '개'],
    milk: ['ml', '병'],
    butter: ['g', '개'],
    cheese: ['장', '개'],
    mozzarella: ['g', '봉'],
    rice: ['개'],
    ramen: ['개'],
    somyeon: ['봉', 'g'],
    ricecake: ['g', '봉'],
    glassNoodle: ['g', '봉'],
  };
  return unitsMap[id] ?? ['개', 'g'];
}

export default function AddItem() {
  const { back, tab, addFridgeItem } = useApp();
  const [selectedId, setSelectedId] = useState(null); // null(미선택) | 'other' | 마스터 재료 id
  const [activeSubCat, setActiveSubCat] = useState(SUB_CATEGORIES[0].name);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantityAmount, setQuantityAmount] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('');
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const { status, data, error, refetch } = useAsyncData(() => api.getIngredients(), []);
  const ingredients = data?.ingredients || [];

  // 검색어가 있으면 카테고리 무시하고 전체 재료에서 이름으로 찾는다 — 카테고리당 최대 25개인
  // 재료 칩을 눈으로 스크롤해서 찾아야 하는 마찰을 없애기 위함.
  const searchTrim = search.trim();
  const visibleIngredients = searchTrim
    ? ingredients.filter((ing) => ing.name.includes(searchTrim))
    : ingredients.filter((ing) => SUB_CATEGORIES.find((c) => c.name === activeSubCat)?.ids.includes(ing.id));

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
      setActiveSubCat('');
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
        {status === 'loading' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--sub)' }}>재료 목록을 불러오고 있어요…</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: '#e5484d' }}>{error}</p>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={refetch}>다시 시도</button>
          </div>
        )}
        
        {status === 'ready' && (
          <>
            <div className="field">
          <label>재료 카테고리</label>
          <div className="chips" style={{ overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 8, paddingBottom: 4 }}>
            {SUB_CATEGORIES.map((cat) => (
              <span key={cat.name} className={`chip${activeSubCat === cat.name ? ' on' : ''}`} onClick={() => { setActiveSubCat(cat.name); if (selectedId === 'other') setSelectedId(null); }}>
                {cat.name}
              </span>
            ))}
            <span className={`chip${isOther ? ' on' : ''}`} onClick={() => setSelectedId('other')}>✏️ 기타(직접 입력)</span>
          </div>
        </div>

        <div className="field">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 재료 이름으로 검색 (예: 대파)"
          />
        </div>

        {(activeSubCat || searchTrim) && (
          <div className="field">
            <label>재료 선택</label>
            {visibleIngredients.length === 0 && searchTrim ? (
              <div className="notice">"{searchTrim}"과 일치하는 재료가 없어요 — 다른 이름으로 찾거나 "기타(직접 입력)"을 써보세요.</div>
            ) : (
            <div className="unit-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {visibleIngredients
                .map((ing) => (
                  <span key={ing.id} className={`chip${selectedId === ing.id ? ' on' : ''}`} onClick={() => setSelectedId(ing.id)}>
                    {ing.emoji} {ing.name}
                  </span>
                ))}
            </div>
            )}
          </div>
        )}

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
