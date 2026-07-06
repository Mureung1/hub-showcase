const trustSignals = ['집중 신뢰도', '지속 신뢰도', '소통 신뢰도', '매너 신뢰도'];

export default function ProjectIntro() {
  return (
    <main className="page">
      <section className="intro" aria-labelledby="project-title">
        <p className="eyebrow">Reading Focus Community</p>
        <h1 id="project-title">독서 집중 모임 플랫폼</h1>
        <p className="summary">
          혼자서는 책을 꾸준히 읽기 어려운 대학생들이 스마트폰을 잠시 내려놓고,
          함께 정해진 시간 동안 읽으며 좋은 독서 사람들과 연결되는 서비스입니다.
        </p>

        <div className="concept">
          <article>
            <h2>핵심 컨셉</h2>
            <p>
              사용자는 독서방에 참여해 15분, 30분, 60분 집중 세션을 완료하고
              독서 후 한 줄 감상과 추천, 토론으로 경험을 이어갑니다.
            </p>
          </article>
          <article>
            <h2>차별점</h2>
            <p>
              단순한 기록이나 경쟁보다 함께 읽기 좋은 사람을 발견하는 데 집중하며,
              신뢰도는 배제가 아닌 더 잘 맞는 방을 추천하기 위한 신호로 활용합니다.
            </p>
          </article>
        </div>

        <ul className="signals" aria-label="신뢰도 지표">
          {trustSignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
