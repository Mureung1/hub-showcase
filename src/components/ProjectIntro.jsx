import "./ProjectIntro.css";

function ProjectIntro() {
    return (
        <div className="project-card">
            <h1>👗 AI 코디 추천 Agent</h1>

            <p className="subtitle">
                날씨, 일정, 선호 스타일을 바탕으로 AI가 나에게 어울리는 코디를 추천해주는 서비스
            </p>

            <section>
                <h2>📌 프로젝트 소개</h2>
                <p>
                    매일 아침 “오늘 뭐 입지?”라는 고민을 해결하기 위한 대화형 AI Agent
                    서비스입니다. 사용자가 날씨, 모임 일정, 선호 스타일을 입력하면 AI가
                    상황에 맞는 코디를 추천해 줍니다.
                </p>
            </section>

            <section>
                <h2>🤖 대화형 Agent 기능</h2>
                <p>
                    AI가 사용자의 상황을 더 정확히 이해하기 위해 먼저 질문을 던지고,
                    답변을 바탕으로 맞춤형 코디를 제안합니다.
                </p>

                <div className="chat-box">
                    <p><strong>AI:</strong> 오늘 어떤 일정이 있나요?</p>
                    <p><strong>사용자:</strong> 친구들이랑 카페에 가요.</p>
                    <p><strong>AI:</strong> 선호하는 스타일은 무엇인가요?</p>
                    <p><strong>사용자:</strong> 러블리하고 편한 스타일이 좋아요.</p>
                    <p><strong>AI:</strong> 오늘 날씨를 고려해 연분홍 니트와 데님 스커트를 추천할게요!</p>
                </div>
            </section>

            <section>
                <h2>✨ 주요 기능</h2>
                <ul>
                    <li>🌤️ 날씨별 코디 추천</li>
                    <li>📅 학교, 발표, 데이트, 모임 등 일정별 코디 추천</li>
                    <li>💖 사용자의 선호 스타일을 반영한 추천</li>
                    <li>👕 보유한 옷 사진 업로드를 통한 AI 옷장 생성</li>
                    <li>🧥 가지고 있는 옷만 활용한 코디 추천 모드</li>
                    <li>🛍️ 가지고 있지 않은 옷까지 포함한 새로운 코디 추천 모드</li>
                </ul>
            </section>

            <section>
                <h2>🎯 해결하고 싶은 문제</h2>
                <p>
                    대학생들은 날씨와 일정에 따라 어떤 옷을 입어야 할지 자주 고민합니다.
                    이 서비스는 사용자의 상황과 옷장을 분석하여 옷 선택에 드는 시간을 줄이고,
                    더 다양한 스타일을 시도할 수 있도록 돕는 것을 목표로 합니다.
                </p>
            </section>
        </div>
    );
}

export default ProjectIntro;