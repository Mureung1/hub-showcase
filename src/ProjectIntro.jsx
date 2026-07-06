function ProjectIntro()
{
    return (
        <div className="intro-container">

            <section className="intro-section">
                <span className="intro-badge">🚀 Web Dev Project</span>
            </section>

            <section className="intro-section">
                <h1 className="intro-title">
                    📅 대학생 마감일 우선순위 정리 도구
                </h1>
            </section>

            <section className="intro-section">
                <p className="intro-desc">
                    과제, 시험, 공모전 등 여러 마감일을 한 번에 관리하고,
                    무엇부터 처리해야 할지 자동으로 정리해주는 서비스입니다.
                </p>
            </section>

            <section className="intro-section intro-section-last">
                <h2 className="intro-subtitle">✨ 주요 기능</h2>
                <ul className="intro-features">
                    <li>✅ 마감일과 중요도를 입력하면 자동 정렬</li>
                    <li>⏰ 남은 기간을 한눈에 확인</li>
                    <li>🧮 순수 로직 기반의 간단한 우선순위 계산</li>
                </ul>
            </section>

        </div>
    );
}

export default ProjectIntro;
