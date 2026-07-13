import './tabs.css'

export default function ProgressTab() {
  return (
    <div className="tab-page">
      <h1>프로젝트 진행</h1>
      <p className="tab-sub">내 태스크와 참여 기록을 관리합니다.</p>

      <div className="tab-empty">
        <h2>표시할 작업이 없습니다.</h2>
        <p>내 태스크·업로드·참여 캘린더는 목업 데이터 연결(3단계)과 함께 구현됩니다.</p>
      </div>
    </div>
  )
}
