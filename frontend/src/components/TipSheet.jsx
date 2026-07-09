import { useApp } from '../context/AppContext';

export default function TipSheet() {
  const { tip, closeTip } = useApp();
  const open = !!tip;
  return (
    <div className={`sheet-dim${open ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeTip(); }}>
      {tip && (
        <div className="sheet">
          <div className="grip" />
          <h2>📖 {tip.title}</h2>
          <div className="tipbox"><b>🍳 어떻게 하나요?</b><br />{tip.how}</div>
          <div className="tipbox"><b>⏱ 언제가 타이밍인가요?</b><br />{tip.when}</div>
          <button className="btn primary" style={{ marginTop: 18 }} onClick={closeTip}>알겠어요!</button>
        </div>
      )}
    </div>
  );
}
