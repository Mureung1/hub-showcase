import './tabs.css'

export default function DashboardTab() {
  return (
    <div className="tab-page">
      <h1>대시보드</h1>
      <p className="tab-sub">메인 프로젝트의 팀 전체 현황을 확인합니다.</p>

      <div className="tab-empty">
        <h2>진행중인 프로젝트가 없습니다.</h2>
        <p>새 프로젝트를 시작해볼까요?</p>
        {/* 프로젝트 생성 플로우는 다음 단계에서 연결 */}
        <button type="button" className="btn btn-dark">새 프로젝트 시작하기</button>
      </div>
    </div>
  )
}
