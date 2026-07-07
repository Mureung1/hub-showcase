import { Link } from 'react-router-dom'

export default function Adjust() {
  return (
    <div className="phone-frame">
      <span className="wf-label">화면 05 · 스케줄 조정</span>
      <h2 className="wf-title">직접 조건을 조정해보세요</h2>

      <span className="wf-label">취침 시각</span>
      <div className="wf-box">[ ────●───── ] 23:30</div>

      <span className="wf-label">기상 시각</span>
      <div className="wf-box">[ ─────●──── ] 05:30</div>

      <span className="wf-label">카페인 섭취량</span>
      <div className="wf-box">[ ───●────── ] 100mg</div>

      <span className="wf-label">카페인 섭취 시각</span>
      <div className="wf-box">[ ●────────── ] 06:00</div>

      <div className="wf-box">
        조정한 조건으로 다시 계산하면, 결과 화면의 그래프와 타임라인이 갱신됩니다.
      </div>

      <div className="wf-btn-row">
        <Link to="/screen/result" className="wf-btn">취소</Link>
        <Link to="/screen/processing" className="wf-btn primary">재계산하기</Link>
      </div>
    </div>
  )
}
