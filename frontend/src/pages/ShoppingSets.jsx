import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { useAsyncData } from '../hooks/useAsyncData';

const MATCH_CHIPS = [
  { v: 'all', label: '전체' },
  { v: 'imminentRescue', label: '임박 재료 구출' },
  { v: 'minCost', label: '최소 지출 완성' },
  { v: 'ingredientShare', label: '식자재 쉐어링' },
  { v: 'fullWeek', label: '일주일 식단' },
];
const LEVEL_CHIPS = [
  { v: 'all', label: '난이도 전체' },
  { v: 'beginner', label: '🟢 초보자' },
  { v: 'mid', label: '🟡 중급자' },
];

export default function ShoppingSets() {
  const { openShoppingList, pickedDishes, go, servingMultiplier, setShareMealCount, setWeekPlanDifficulty, weekPlanType, setWeekPlanType } = useApp();
  const [match, setMatch] = useState('all');
  const [level, setLevel] = useState('all');
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);

  const { status, data, error, refetch } = useAsyncData(
    () => api.getShoppingSets({ match, level, pickedIds: pickedDishes, multiplier: servingMultiplier }),
    [match, level, pickedDishes, servingMultiplier],
  );
  const sets = data?.sets ?? [];

  return (
    <section className="screen active">
      <div className="appbar"><h1>추천 재료 세트</h1></div>
      <div className="content">
        <div className="chips" style={{ marginBottom: 6 }}>
          {MATCH_CHIPS.map((c) => (
            <span key={c.v} className={`chip${match === c.v ? ' on' : ''}`} onClick={() => setMatch(c.v)}>{c.label}</span>
          ))}
        </div>
        <div className="chips">
          {LEVEL_CHIPS.map((c) => (
            <span key={c.v} className={`chip${level === c.v ? ' on' : ''}`} onClick={() => setLevel(c.v)}>{c.label}</span>
          ))}
        </div>


        <div className="notice">🧊 냉장고에 남은 재료를 최대한 활용하는 조합으로 골랐어요. 이미 있는 재료는 구매 목록에서 빠져요.</div>

        {status === 'loading' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--sub)' }}>세트를 계산하고 있어요…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: '#e5484d' }}>{error}</p>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={refetch}>다시 시도</button>
          </div>
        )}

        {status === 'ready' && sets.map((s) => (
          <div key={s.id} className="card interactive" style={{ padding: 16 }} onClick={() => {
            if (s.id === 'fullWeek') {
              setWeekPlanType('meal');
              setShowDifficultyPicker(true);
            } else if (s.id === 'ingredientShare') {
              setWeekPlanType('meal');
              setShowMealPicker(true);
            } else if (s.id === 'sideShare') {
              setWeekPlanType('side');
              setShowMealPicker(true);
            } else {
              openShoppingList(s.id);
            }
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b style={{ fontSize: 16 }}>{s.name}</b>
              {s.badge && <span className="badge green">{s.badge}</span>}
              {s.level && <span className="badge amber">{s.level}</span>}
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.6 }}>
              재료 <b style={{ color: 'var(--text)' }}>{s.buyCount}개 구매</b>로 <b style={{ color: 'var(--green-dark)' }}>{s.dishCount}가지 요리</b> 가능<br />{s.dishes}
            </p>
            {s.desc && (
              <p style={{ fontSize: 12.5, color: 'var(--green-dark)', fontWeight: 700, marginTop: 6 }}>💡 {s.desc}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 14, fontWeight: 800 }}>
              <span style={{ color: 'var(--sub)' }}>예상 비용</span>
              <span style={{ color: 'var(--green-dark)' }}>
                {s.totalRange
                  ? `약 ${s.totalRange[0].toLocaleString()}원 ~ ${s.totalRange[1].toLocaleString()}원`
                  : `약 ${s.total?.toLocaleString()}원`
                }
              </span>
            </div>
          </div>
        ))}

        {status === 'ready' && sets.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--sub)' }}>조건에 맞는 세트가 없어요. 필터를 바꿔보세요.</p>
          </div>
        )}
      </div>

    {showMealPicker && (
      <div className="sheet-backdrop" onClick={() => setShowMealPicker(false)}>
        <div className="sheet bottom" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-head">
            <h2>{weekPlanType === 'side' ? '반찬 몇 가지를 원하시나요?' : '몇 끼를 원하시나요?'}</h2>
            <button className="btn-close" onClick={() => setShowMealPicker(false)}>✕</button>
          </div>
          <div className="sheet-body" style={{ paddingBottom: 30 }}>
            <p style={{ fontSize: 14, color: 'var(--sub)', marginBottom: 20 }}>
              현재 냉장고 재료를 활용해서 가장 적은 종류의 식자재만 추가로 구매하도록 조합해 드려요.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    className="btn ghost"
                    style={{ padding: 12, fontSize: 15, fontWeight: 'bold' }}
                    onClick={() => {
                      setShareMealCount(n);
                      setShowMealPicker(false);
                      openShoppingList(weekPlanType === 'side' ? 'sideShare' : 'ingredientShare');
                    }}
                  >
                    {weekPlanType === 'side' ? `${n}가지` : `${n}끼`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDifficultyPicker && (
        <div className="sheet-backdrop" onClick={() => setShowDifficultyPicker(false)}>
          <div className="sheet bottom" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>일주일 식단 난이도를 골라주세요</h2>
              <button className="btn-close" onClick={() => setShowDifficultyPicker(false)}>✕</button>
            </div>
            <div className="sheet-body" style={{ paddingBottom: 30 }}>
              <p style={{ fontSize: 14, color: 'var(--sub)', marginBottom: 20 }}>
                선택한 난이도의 레시피들로만 일주일 식단을 구성합니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {[
                  { id: 'all', label: '전체 난이도' },
                  { id: 'beginner', label: '🟢 쉬움 (재료와 과정이 간단해요)' },
                  { id: 'mid', label: '🟡 보통 (무난하게 도전할 수 있어요)' },
                  { id: 'expert', label: '🔴 어려움 (시간과 정성이 필요해요)' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    className="btn ghost"
                    style={{ padding: 16, fontSize: 15, fontWeight: 'bold', textAlign: 'left' }}
                    onClick={() => {
                      setWeekPlanDifficulty(opt.id);
                      setShowDifficultyPicker(false);
                      go('meal-plan-picker');
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
