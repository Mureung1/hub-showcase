import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

export default function ShoppingList() {
  const { back, go, selectedSetId } = useApp();
  const [list, setList] = useState(null);

  useEffect(() => { api.getShoppingList(selectedSetId).then(setList); }, [selectedSetId]);
  if (!list) return null;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>장보기 리스트</h1></div>
      <div className="content">
        <div className="notice">🛒 <b>{list.setName}</b> · 냉장고에 이미 있는 재료 {list.have.length}개는 제외했어요</div>
        <div className="card" style={{ padding: '6px 16px' }}>
          {list.buy.map((it, i) => (
            <div className="shop-row" key={i}>
              <input type="checkbox" defaultChecked={it.checked} />
              <div className="nm">{it.name}<small>{it.uses}</small></div>
              <span className="pr">{it.price.toLocaleString()}원</span>
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
        <div className="total-bar"><span>예상 합계 ({list.buy.length}개)</span><span className="sum">{list.total.toLocaleString()}원</span></div>
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" onClick={() => go('receipt-camera')}>장보기 완료 → 영수증 촬영 📷</button>
      </div>
    </section>
  );
}
