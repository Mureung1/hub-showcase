import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ReceiptCamera() {
  const { back, shootReceipt } = useApp();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // shutter 버튼은 화면을 직접 그리지 않고, capture 속성이 붙은 파일 입력을 열어
  // 기기 기본 카메라 앱을 띄운다 — 실제 카메라 미리보기를 직접 구현하지 않아도 된다.
  const handleShoot = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 또 발생하도록 초기화
    if (!file) return;

    setLoading(true);
    try {
      await shootReceipt(file);
    } catch (error) {
      console.error(error);
      alert(error.message || '영수증 촬영 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button className="shutter" onClick={handleShoot} disabled={loading} aria-label="촬영" />
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--sub)', marginTop: 12 }}>촬영하면 품목을 자동으로 인식해요</p>
      </div>
    </section>
  );
}
