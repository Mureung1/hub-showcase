import './TabBar.css'

// 탭 클릭 시 실제 화면 이동(라우팅)은 아직 연결 안 함 — s1~s4 React 이관 후 연결 예정
function TabBar({ activeTab }) {
  return (
    <div className="tabbar">
      <div className={`tab${activeTab === 'home' ? ' tab--on' : ''}`}>
        <span className="tab-ico">☰</span>홈
      </div>
      <div className={`tab${activeTab === 'settings' ? ' tab--on' : ''}`}>
        <span className="tab-ico">⚙</span>설정
      </div>
    </div>
  )
}

export default TabBar
