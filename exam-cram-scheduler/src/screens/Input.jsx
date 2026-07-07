import { Link } from 'react-router-dom'

export default function Input() {
  return (
    <div className="phone-frame">
      <span className="wf-label">화면 02 · 정보 입력</span>
      <h2 className="wf-title">상황을 알려주세요</h2>

      <span className="wf-label">자연어 입력</span>
      <div className="wf-box" style={{ minHeight: 56 }}>
        예) "시험이 모레 아침 9시에 있고, 평소엔 12시에 자서 7시에 일어나. 공부는 아직 6시간 더 해야 해."
      </div>

      <span className="wf-label">평소 수면 패턴</span>
      <div className="wf-box">평소 취침 [ 00:00 ▾ ] · 기상 [ 07:00 ▾ ]</div>

      <span className="wf-label">시험 일시</span>
      <div className="wf-box">[ 날짜 선택 ▾ ] [ 시각 선택 ▾ ]</div>

      <span className="wf-label">남은 공부 시간</span>
      <div className="wf-box">[ ─────●───── ] 6시간</div>

      <span className="wf-label">카페인 민감도</span>
      <div className="wf-box">( ) 둔감 · (●) 보통 · ( ) 예민</div>

      <div className="wf-btn-row">
        <Link to="/screen/home" className="wf-btn">이전</Link>
        <Link to="/screen/processing" className="wf-btn primary">계산하기</Link>
      </div>
    </div>
  )
}
