import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="phone-frame">
      <span className="wf-label">화면 01 · 홈</span>
      <h2 className="wf-title">시험 벼락치기 스케줄러</h2>
      <div className="wf-box">
        [로고 / 일러스트 영역]
      </div>
      <div className="wf-box">
        검증된 수면과학 모델로, 시험 날짜에 맞춰 최적의 수면·카페인 스케줄을 자연어로 물어보세요.
      </div>
      <div className="wf-box">
        [최근 계산 기록 미리보기 — 로그인 시에만 노출]
      </div>
      <div className="wf-btn-row">
        <Link to="/screen/input" className="wf-btn primary">시작하기</Link>
      </div>
    </div>
  )
}
