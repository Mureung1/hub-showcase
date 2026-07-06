import "./ProjectIntro.css";

function ProjectIntro() {
  return (
    <div className="container">
      <section className="hero">
        <h1>🎓 CampusShare</h1>
        <p className="subtitle">
          같이 사면 더 싸고, 더 편리한 대학생 공동구매 플랫폼
        </p>

        <div className="buttons">
          <button className="primary">공동구매 시작하기</button>
          <button className="secondary">서비스 둘러보기</button>
        </div>
      </section>

      <section className="section">
        <h2>🔥 모집 중인 공동구매</h2>

        <div className="cards">

          <div className="card">
            <div className="emoji">🍗</div>
            <h3>BBQ 황금올리브</h3>
            <p>3 / 4명 모집</p>

            <div className="progress">
              <div className="bar" style={{ width: "75%" }}></div>
            </div>

            <span>⏰ 15분 남음</span>

            <button>참여하기</button>
          </div>

          <div className="card">
            <div className="emoji">📚</div>
            <h3>자료구조 교재</h3>
            <p>5 / 6명 모집</p>

            <div className="progress">
              <div className="bar" style={{ width: "85%" }}></div>
            </div>

            <span>📦 배송비 절약</span>

            <button>참여하기</button>
          </div>

          <div className="card">
            <div className="emoji">🧻</div>
            <h3>생필품 공동구매</h3>
            <p>2 / 5명 모집</p>

            <div className="progress">
              <div className="bar" style={{ width: "40%" }}></div>
            </div>

            <span>💸 무료배송 도전</span>

            <button>참여하기</button>
          </div>

        </div>
      </section>

      <section className="section">
        <h2>🚨 왜 필요한 서비스일까요?</h2>

        <div className="problem-grid">

          <div className="problem">
            💸
            <h3>배달비 부담</h3>
            <p>혼자 주문하면 배달비가 비싸요.</p>
          </div>

          <div className="problem">
            👥
            <h3>모집 어려움</h3>
            <p>같이 구매할 사람을 찾기 힘들어요.</p>
          </div>

          <div className="problem">
            📦
            <h3>배송비 절약</h3>
            <p>무료배송 기준을 함께 맞출 수 있어요.</p>
          </div>

          <div className="problem">
            🏫
            <h3>학교 인증</h3>
            <p>같은 학교 학생끼리 안전하게 거래합니다.</p>
          </div>

        </div>
      </section>

      <section className="section">
        <h2>✨ 주요 기능</h2>

        <div className="feature-grid">
          <div>🛒 공동구매 생성</div>
          <div>🔍 모집글 검색</div>
          <div>💬 실시간 채팅</div>
          <div>📍 학교 인증</div>
          <div>⭐ 후기 시스템</div>
          <div>🚚 배송 진행 확인</div>
        </div>
      </section>
    </div>
  );
}

export default ProjectIntro;