import { useApp } from '../context/AppContext';

export default function MealShoppingList() {
  const { back, go, mealShoppingList } = useApp();
  if (!mealShoppingList) return null;
  const { items, total } = mealShoppingList;

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>이번 주 장보기 리스트</h1></div>
      <div className="content">
        <div className="notice">🛒 이번 주 식단 재료 중 냉장고에 없는 <b>{items.length}</b>개만 담았어요</div>
        <div className="card" style={{ padding: '6px 16px' }}>
          {items.length ? items.map((it, i) => (
            <div className="shop-row" key={i} style={i === items.length - 1 ? { borderBottom: 'none' } : undefined}>
              <input type="checkbox" defaultChecked />
              <div className="nm">{it.label}<small>{it.uses.join(' · ')}</small></div>
              <span className="pr">{it.price.toLocaleString()}원</span>
            </div>
          )) : (
            <div className="shop-row" style={{ borderBottom: 'none' }}><div className="nm" style={{ color: 'var(--sub)' }}>이미 냉장고 재료로 충분해요! 바로 요리하러 가볼까요?</div></div>
          )}
        </div>
        <div className="total-bar"><span>예상 합계</span><span className="sum">{total.toLocaleString()}원</span></div>
      </div>
      <div className="bottom-fixed">
        <button className="btn primary" onClick={() => go('receipt-camera')}>장보기 완료 → 영수증 촬영 📷</button>
      </div>
    </section>
  );
}
