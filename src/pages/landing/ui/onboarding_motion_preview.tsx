export function OnboardingMotionPreview() {
  return (
    <section
      className="motion-chapter"
      id="retrieve-flow"
      aria-labelledby="motion-chapter-title"
    >
      <h2 id="motion-chapter-title">지금 하는 일로 꺼내보세요</h2>

      <div
        className="motion-stage"
        aria-label="현재 상황으로 다시 꺼낸 링크 예시"
      >
        <p className="motion-query">
          <span>지금 필요한 상황</span>
          <strong>포트폴리오 첫 화면 참고</strong>
        </p>

        <div className="motion-sources">
          <article className="motion-source-card">
            <span>디자인</span>
            <strong>모바일 온보딩 흐름</strong>
            <small>첫 화면의 선택 부담 줄이기</small>
            <div className="motion-source-card__footer">
              <span className="motion-connector">메모의 “첫 화면”과 연결</span>
              <span className="motion-source-card__action">원문 열기 ↗</span>
            </div>
          </article>

          <article className="motion-source-card">
            <span>브랜딩</span>
            <strong>브랜드 랜딩 사례</strong>
            <small>큰 타이포와 하이라이트 참고</small>
            <div className="motion-source-card__footer">
              <span className="motion-connector">제목의 “랜딩”과 연결</span>
              <span className="motion-source-card__action">원문 열기 ↗</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
