import { Link } from 'react-router-dom'

export default function Result() {
  return (
    <div className="phone-frame">
      <span className="wf-label">화면 04 · 결과</span>
      <h2 className="wf-title">추천 스케줄</h2>

      <span className="wf-label">시간대별 예측 각성도</span>
      <div className="wf-graph" />

      <span className="wf-label">추천 타임라인 (지금 ~ 시험 시각)</span>
      <div className="wf-timeline">
        <div className="slot study" />
        <div className="slot caffeine" />
        <div className="slot study" />
        <div className="slot sleep" />
        <div className="slot sleep" />
        <div className="slot caffeine" />
        <div className="slot study" />
      </div>
      <div className="legend">
        <span><span className="dot study" />공부</span>
        <span><span className="dot sleep" />수면</span>
        <span><span className="dot caffeine" />카페인 섭취</span>
      </div>

      <div className="wf-box">
        오늘 23:30 취침 → 05:30 기상 → 06:00 카페인 100mg 섭취 시,
        시험 시작(09:00) 시점 예측 각성도가 가장 높습니다.
      </div>

      <div className="wf-btn-row">
        <Link to="/screen/adjust" className="wf-btn">조건 조정하기</Link>
        <Link to="/screen/home" className="wf-btn primary">저장하고 마치기</Link>
      </div>
    </div>
  )
}
