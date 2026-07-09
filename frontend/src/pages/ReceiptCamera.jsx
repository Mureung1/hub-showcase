import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ReceiptCamera() {
  const { back, shootReceipt } = useApp();
  const [loading, setLoading] = useState(false);

  const handleShoot = async () => {
    setLoading(true);
    await shootReceipt();
    setLoading(false);
  };

  return (
    <section className="screen active">
      <div className="appbar"><button className="btn-back" onClick={back}>‹</button><h1>영수증 촬영</h1></div>
      <div className="content">
        <div className="viewfinder">
          <div className="guide">
            <div className="r-emoji">🧾</div>
            <div>{loading ? '인식하는 중…' : <>점선 안에 영수증 전체가<br />들어오게 맞춰 주세요</>}</div>
          </div>
        </div>
        <button className="shutter" onClick={handleShoot} disabled={loading} aria-label="촬영" />
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--sub)', marginTop: 12 }}>촬영하면 품목을 자동으로 인식해요</p>
      </div>
    </section>
  );
}
