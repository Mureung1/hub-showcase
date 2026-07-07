import { Link } from 'react-router-dom'

const steps = [
  '자연어에서 조건 추출 완료',
  '평소 수면 패턴 확인 완료',
  'Two-Process Model 계산 중…',
  '카페인 상호작용 반영 대기',
  '후보 스케줄 비교 대기',
]

export default function Processing() {
  return (
    <div className="phone-frame">
      <span className="wf-label">화면 03 · 처리 중</span>
      <h2 className="wf-title">스케줄을 계산하고 있어요</h2>
      <div className="wf-box" style={{ textAlign: 'center' }}>
        [ 로딩 스피너 ]
      </div>
      {steps.map((s, i) => (
        <div key={s} className="wf-box" style={{ opacity: i < 2 ? 0.5 : 1 }}>
          {i < 2 ? '✓ ' : '· '}{s}
        </div>
      ))}
      <div className="wf-btn-row">
        <Link to="/screen/result" className="wf-btn primary">(자동 이동) 결과 화면 →</Link>
      </div>
    </div>
  )
}
