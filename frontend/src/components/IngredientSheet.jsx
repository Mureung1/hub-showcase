import { useApp } from '../context/AppContext';

export default function IngredientSheet() {
  const { fridge, sheetItemId, closeSheet, deleteFridgeItem } = useApp();
  const open = !!sheetItemId;
  const f = sheetItemId ? fridge[sheetItemId] : null;

  const handleDelete = async () => {
    await deleteFridgeItem(sheetItemId);
    closeSheet();
  };

  return (
    <div className={`sheet-dim${open ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
      {f && (
        <div className="sheet">
          <div className="grip" />
          <h2>
            {f.emoji} {f.name}{' '}
            <span className={`badge ${f.imminent ? 'red' : 'green'}`}>{f.levels ? f.expiry : (f.expiryLabel || '—')}</span>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 8 }}>
            보유: {f.levels ? f.levels[f.level] : f.qtyLabel}{f.purchased ? ` · ${f.purchased} 구매` : ''}
          </p>
          <div className="tipbox"><b>🍳 요리에서의 역할</b><br />{f.role}</div>
          <div className="tipbox"><b>🧊 보관법 팁</b><br />{f.tip}</div>
          <div className="btn-row" style={{ marginTop: 18 }}>
            <button className="btn gray" onClick={handleDelete}>🗑 삭제</button>
            <button className="btn ghost" onClick={closeSheet}>수량·기한 수정</button>
          </div>
          <button className="btn primary" style={{ marginTop: 10 }} onClick={closeSheet}>닫기</button>
        </div>
      )}
    </div>
  );
}
