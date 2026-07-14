import './tabs.css'

export default function ProjectsTab() {
  return (
    <div className="tab-page">
      <h1>프로젝트 관리</h1>
      <p className="tab-sub">내 프로젝트 목록을 관리합니다.</p>

      <div className="tab-empty">
        <h2>등록된 프로젝트가 없습니다.</h2>
        <p>프로젝트 리스트·[메인] 배지·순서 변경은 목업 데이터 연결(3단계)과 함께 구현됩니다.</p>
      </div>
    </div>
  )
}
