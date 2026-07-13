import { useApp } from '../context/AppContext';
import { fridgeAvailable } from '../logic/fridgeLogic';
import Row from '../components/Row';

export default function Fridge() {
  const { fridge, go, openSheet } = useApp();
  const ids = Object.keys(fridge);
  const imminentIds = ids.filter((id) => fridge[id].isFresh && fridge[id].imminent && fridgeAvailable(fridge, id));
  const freshIds = ids.filter((id) => fridge[id].isFresh && !fridge[id].imminent && fridgeAvailable(fridge, id));
  const processedIds = ids.filter((id) => !fridge[id].isFresh && fridgeAvailable(fridge, id));

  const renderFresh = (id) => {
    const f = fridge[id];
    return (
      <Row key={id} emoji={f.emoji} name={f.name} nameColor={f.imminent ? 'var(--red)' : undefined}
        meta={`${f.qtyLabel} · ${f.purchased} 구매`}
        right={<span className={`badge ${f.imminent ? 'red' : 'green'}`}>{f.expiry}</span>}
        onClick={() => openSheet(id)} />
    );
  };

  return (
    <section className="screen active">
      <div className="appbar"><h1>나만의 냉장고</h1></div>
      <div className="content">
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button className="btn primary" onClick={() => go('receipt-camera')}>📷 영수증 촬영</button>
          <button className="btn ghost" onClick={() => go('add-item')}>＋ 직접 추가</button>
        </div>

        {!!imminentIds.length && (
          <>
            <div className="section-title">유통기한 임박 🔥</div>
            <div>{imminentIds.map(renderFresh)}</div>
          </>
        )}

        <div className="section-title">신선식품</div>
        <div>{freshIds.length ? freshIds.map(renderFresh) : <p style={{ fontSize: 13, color: 'var(--sub)', padding: 4 }}>없어요</p>}</div>

        <div className="section-title">가공식품</div>
        <div>
          {processedIds.map((id) => {
            const f = fridge[id];
            const badge = f.expiry ? <span className="badge green">{f.expiry}</span> : <span className="badge gray">—</span>;
            const meta = f.expiry ? f.qtyLabel : `${f.qtyLabel} · 유통기한 미입력`;
            return <Row key={id} emoji={f.emoji} name={f.name} meta={meta} right={badge} onClick={() => openSheet(id)} />;
          })}
        </div>
      </div>
    </section>
  );
}
