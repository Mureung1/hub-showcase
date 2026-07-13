import Brand from "../components/Brand";

function MentorListComingSoonPage() {
  return (
    <div className="mentor-list-coming-soon-page">
      <header className="page-header">
        <Brand />
        <span className="tag">MENTEE</span>
      </header>

      <main className="page-container mentor-list-coming-soon-container">
        <section className="card mentor-list-coming-soon-card">
          <div className="coming-soon-visual" aria-hidden="true">
            <span>01</span>
          </div>
          <p className="eyebrow">MENTOR LIST</p>
          <h1 className="page-title">멘토 목록 화면</h1>
          <p className="body-text">
            나에게 맞는 멘토를 찾을 수 있도록 화면을 준비하고 있습니다.
          </p>
          <div className="card-muted-box coming-soon-notice">
            <strong>현재 개발 중입니다</strong>
            <span className="muted-text">멘토 프로필과 검색 기능이 곧 추가될 예정입니다.</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default MentorListComingSoonPage;
