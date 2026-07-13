import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const TODAY_ISO = '2026-07-08';
function ddayToISO(label) {
  if (!label) return TODAY_ISO;
  const n = parseInt(label.slice(2), 10);
  const sign = label.startsWith('D-') ? 1 : -1;
  const d = new Date(TODAY_ISO);
  d.setDate(d.getDate() + sign * n);
  return d.toISOString().slice(0, 10);
}

export default function IngredientSheet() {
  const { fridge, sheetItemId, closeSheet, deleteFridgeItem, updateFridgeItem } = useApp();
  const open = !!sheetItemId;
  const f = sheetItemId ? fridge[sheetItemId] : null;

  // 'view' | 'confirmDelete' | 'edit'
  const [mode, setMode] = useState('view');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editItemIndex, setEditItemIndex] = useState(null);
  const [editQtyAmount, setEditQtyAmount] = useState('');
  const [editQtyUnit, setEditQtyUnit] = useState('');
  const [editQtyLabel, setEditQtyLabel] = useState('');
  const [editExpiry, setEditExpiry] = useState(TODAY_ISO);

  useEffect(() => {
    setMode('view');
    setEditItemIndex(null);
  }, [sheetItemId]);

  const handleClose = () => { setMode('view'); closeSheet(); };

  const handleDeleteConfirmed = async () => {
    const id = sheetItemId;
    setDeleting(true);
    try {
      await deleteFridgeItem(id);
      closeSheet(id);
    } catch (err) {
      alert(err.message || '삭제 중 오류가 발생했어요.');
    } finally {
      setDeleting(false);
    }
  };

  const startEditItem = (idx) => {
    if (!f || !f.items) return;
    const item = f.items[idx];
    setEditItemIndex(idx);
    setEditQtyAmount(item.qtyAmount ?? '');
    setEditQtyUnit(item.qtyUnit ?? '');
    setEditQtyLabel(item.qtyLabel ?? '');
    setEditExpiry(item.expiry ? ddayToISO(item.expiry) : '');
    setMode('edit');
  };

  const handleDeleteItem = async (idx) => {
    if (!window.confirm('이 구매 내역을 삭제할까요?')) return;
    setDeleting(true);
    try {
      await updateFridgeItem(sheetItemId, { deleteItemIndex: idx });
      if (f.items.length <= 1) {
         closeSheet(sheetItemId);
      }
    } catch (err) {
      alert(err.message || '삭제 중 오류가 발생했어요.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    const id = sheetItemId;
    setSaving(true);
    try {
      const patch = { 
         itemIndex: editItemIndex,
         qtyAmount: editQtyAmount !== '' ? Number(editQtyAmount) : undefined,
         qtyUnit: editQtyUnit || undefined,
         qtyLabel: editQtyLabel || undefined,
         expiryDate: editExpiry || null,
      };
      await updateFridgeItem(id, patch);
      setMode('view');
    } catch (err) {
      alert(err.message || '수정 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`sheet-dim${open ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      {f && (
        <div className="sheet">
          <div className="grip" />

          {mode === 'view' && (
            <>
              <h2>
                {f.emoji} {f.name}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--sub)', marginTop: 8 }}>
                총 보유량: <b>{f.qtyLabel}</b>
              </p>
              
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text)' }}>보유 내역</h3>
                {f.items && f.items.map((item, idx) => {
                  const qty = (item.qtyAmount !== undefined) ? `${item.qtyAmount}${item.qtyUnit}` : item.qtyLabel;
                  return (
                    <div key={idx} style={{ background: 'var(--bg-card)', padding: 14, borderRadius: 12, marginBottom: 10, border: '1px solid var(--border)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                         <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{qty}</span>
                         <span className={`badge ${item.imminent ? 'red' : 'green'}`}>{item.expiry || '—'}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--sub)' }}>{item.purchased} 구매</div>
                      
                      <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 6 }}>
                         <button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12, minHeight: 0 }} onClick={() => startEditItem(idx)}>수정</button>
                         <button className="btn gray" style={{ padding: '4px 8px', fontSize: 12, minHeight: 0 }} onClick={() => handleDeleteItem(idx)} disabled={deleting}>삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="tipbox" style={{ marginTop: 16 }}><b>🍳 요리에서의 역할</b><br />{f.role}</div>
              <div className="tipbox"><b>🧊 보관법 팁</b><br />{f.tip}</div>
              
              <div className="btn-row" style={{ marginTop: 24 }}>
                <button className="btn gray" onClick={() => setMode('confirmDelete')}>🗑 재료 전체 삭제</button>
              </div>
              <button className="btn primary" style={{ marginTop: 10 }} onClick={handleClose}>닫기</button>
            </>
          )}

          {mode === 'confirmDelete' && (
            <>
              <h2>🗑 {f.name} 삭제할까요?</h2>
              <div className="tipbox" style={{ background: 'var(--red-light)' }}>
                삭제하면 되돌릴 수 없어요. 냉장고 목록에서 완전히 사라져요.
              </div>
              <div className="btn-row" style={{ marginTop: 18 }}>
                <button className="btn ghost" onClick={() => setMode('view')} disabled={deleting}>취소</button>
                <button className="btn gray" onClick={handleDeleteConfirmed} disabled={deleting}>
                  {deleting ? '삭제하는 중…' : '정말 삭제'}
                </button>
              </div>
            </>
          )}

          {mode === 'edit' && (
            <>
              <h2>{f.emoji} {f.name} 내역 수정</h2>
              <div className="field" style={{ marginTop: 16 }}>
                <label>수량</label>
                {f.isFresh ? (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-body)', borderRadius: '12px', padding: '0 16px', border: '1px solid var(--border)' }}>
                    <input type="number" value={editQtyAmount} onChange={(e) => setEditQtyAmount(e.target.value)} placeholder="예) 300" style={{ flex: 1, border: 'none', background: 'transparent', padding: '16px 0', fontSize: '1.1rem', outline: 'none' }} />
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{editQtyUnit}</span>
                  </div>
                ) : (
                  <input type="text" value={editQtyLabel} onChange={(e) => setEditQtyLabel(e.target.value)} placeholder="예) 1개" />
                )}
              </div>
              <div className="field">
                <label>유통기한{!f.isFresh && ' (선택)'}</label>
                <input type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
              </div>
              <div className="btn-row" style={{ marginTop: 24 }}>
                <button className="btn ghost" onClick={() => setMode('view')} disabled={saving}>취소</button>
                <button className="btn primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? '저장하는 중…' : '저장'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
