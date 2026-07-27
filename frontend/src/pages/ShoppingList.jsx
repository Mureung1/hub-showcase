import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { useAsyncData } from '../hooks/useAsyncData';

export default function ShoppingList() {
  const { back, go, selectedSetId, pickedDishes, servingMultiplier, shareMealCount } = useApp();
  const [checked, setChecked] = useState([]);

  const { status, data: list, error, refetch } = useAsyncData(
    () => api.getShoppingList(selectedSetId, pickedDishes, servingMultiplier, shareMealCount),
    [selectedSetId, pickedDishes, servingMultiplier, shareMealCount],
  );

  useEffect(() => {
    setChecked(list?.buy?.map(() => true) ?? []);
  }, [list]);

  const toggleCheck = (i) => setChecked((prev) => prev.map((v, idx) => idx === i ? !v : v));
  const checkedTotal = list ? list.buy.reduce((sum, it, i) => sum + (checked[i] ? it.price : 0), 0) : 0;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>장보기 리스트</h1></div>
      <div className="content">
        {status === 'loading' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: 'var(--sub)' }}>장보기 리스트를 계산하고 있어요…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <p style={{ fontSize: 13, color: '#e5484d' }}>{error}</p>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={refetch}>다시 시도</button>
          </div>
        )}

        {status === 'ready' && list && (
          <>
            <div className="notice">🛒 <b>{list.setName}</b> · 냉장고에 이미 있는 재료 {list.have.length}개는 제외했어요</div>
            <div className="card" style={{ padding: '6px 16px' }}>
              {list.buy.map((it, i) => (
                <div className="shop-row" key={i} onClick={() => toggleCheck(i)} style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked[i] ?? true} onChange={() => toggleCheck(i)} />
                  <div className="nm" style={{ opacity: checked[i] ? 1 : 0.4 }}>
                    {it.name}<small>{it.uses}</small>
                    {it.actualCost < it.price && (
                      <small style={{ color: 'var(--sub)' }}>실제 쓰는 양은 약 {it.actualCost.toLocaleString()}원어치, 나머지는 마트 최소 판매 단위(1팩) 때문에 같이 사는 거예요</small>
                    )}
                  </div>
                  <span className="pr" style={{ opacity: checked[i] ? 1 : 0.4 }}>{it.price.toLocaleString()}원</span>
                </div>
              ))}
              {list.have.map((it, i) => (
                <div className="shop-row have" key={it.name} style={i === list.have.length - 1 ? { borderBottom: 'none' } : undefined}>
                  <input type="checkbox" disabled />
                  <div className="nm">{it.name}<small>{it.note}</small></div>
                  <span className="pr">—</span>
                </div>
              ))}
            </div>
            <div className="total-bar"><span>선택 합계 ({list.buy.filter((_, i) => checked[i]).length}개)</span><span className="sum">{checkedTotal.toLocaleString()}원</span></div>
          </>
        )}
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" onClick={() => go('receipt-camera')}>장보기 완료 → 영수증 촬영 📷</button>
      </div>
    </section>
  );
}
