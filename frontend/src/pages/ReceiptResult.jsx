import { useApp } from '../context/AppContext';

export default function ReceiptResult() {
  const { receipt, back, go } = useApp();
  if (!receipt) return null;
  const matchedCount = receipt.items.filter((it) => it.matched).length;
  const hasFail = receipt.items.some((it) => !it.matched);

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>인식 결과 확인</h1></div>
      <div className="content">
        <div className="notice">
          {receipt.store} · {receipt.date} · 총 {receipt.items.length}개 품목 중 <b style={{ color: 'var(--green-dark)' }}>{matchedCount}개 인식 성공</b>
        </div>
        <div className="card" style={{ padding: '6px 16px' }}>
          {receipt.items.map((it, i) => (
            <div key={i} className={`ocr-row${it.matched ? '' : ' fail'}`} style={i === receipt.items.length - 1 ? { borderBottom: 'none' } : undefined}>
              <span className="st">{it.matched ? '✅' : '⚠️'}</span>
              {it.matched ? (
                <div className="nm">{it.quantityLabel}<small>영수증: {it.rawText}</small></div>
              ) : (
                <div className="nm">인식 실패 항목 1건<small>글자가 흐릿해요 · 재촬영하면 다시 인식해요</small></div>
              )}
              {it.matched && <span className={`badge ${it.category === 'fresh' ? 'green' : 'gray'}`}>{it.category === 'fresh' ? '신선식품' : '가공식품'}</span>}
            </div>
          ))}
        </div>
        {hasFail && <div className="notice" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>⚠️ 일부 품목을 인식하지 못했어요. 재촬영하거나, 인식된 품목만 먼저 반영할 수 있어요.</div>}
      </div>
      <div className="bottom-fixed">
        <div className="btn-row">
          <button className="btn gray" onClick={back}>📷 재촬영</button>
          <button className="btn primary" onClick={() => go('expiry-check')}>{matchedCount}개 품목 반영</button>
        </div>
      </div>
    </section>
  );
}
