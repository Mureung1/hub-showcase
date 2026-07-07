import NewsCard, { type NewsCardProps } from "./components/NewsCard";

const researchCards: NewsCardProps[] = [
  {
    title: "프로젝트 데이터와 커뮤니케이션 문제가 재작업 비용으로 이어진다",
    source: "Autodesk + FMI",
    thumbnail: "/images/research-construction.svg",
  },
  {
    title: "팀 지식베이스에서 답을 찾고 출처와 함께 공유하는 흐름",
    source: "Notion AI",
    thumbnail: "/images/research-knowledge.svg",
  },
  {
    title: "업데이트 확인과 도구 전환이 실제 작업 시간을 잠식한다",
    source: "Asana Anatomy of Work",
    thumbnail: "/images/research-work.svg",
  },
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Shared Brain Agent</p>
        <h1>모두의 뇌</h1>
        <p className="hero-copy">
          회의록, 연구 메모, 설계 피드백에 흩어진 맥락을 연결해 팀 전체가
          같은 배경지식 위에서 협업하도록 돕는 AI 에이전트입니다.
        </p>
      </section>

      <section className="news-section" aria-labelledby="research-title">
        <div className="section-heading">
          <h2 id="research-title">기획 근거 카드</h2>
          <p>시장 조사와 경쟁 분석에서 확인한 핵심 근거입니다.</p>
        </div>

        <div className="news-grid">
          {researchCards.map((card) => (
            <NewsCard key={card.title} {...card} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
