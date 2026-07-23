type LandingHeroProps = {
  onEnterWorkspace: () => void;
};

export function LandingHero({ onEnterWorkspace }: LandingHeroProps) {
  return (
    <section className="landing-hero" id="service" aria-labelledby="landing-title">
      <div className="landing-copy">
        <span className="section-label">Project to Portfolio</span>
        <h1 id="landing-title">프로젝트는 끝나도, 내가 한 일은 남도록.</h1>
        <p>
          PtoP는 GitHub Repository를 바탕으로 프로젝트 경험을 다시 읽고,
          포트폴리오와 회고로 이어질 단서를 정리해주는 서비스입니다.
        </p>
        <div className="landing-actions">
          <button className="primary-button" type="button" onClick={onEnterWorkspace}>
            내 작업실 입장
          </button>
          <a className="quiet-link" href="#workflow">어떻게 정리하나요?</a>
        </div>
      </div>
      <div className="landing-aside" aria-label="PtoP 서비스 요약">
        <span>01</span>
        <strong>기억이 흐려지기 전에</strong>
        <p>참여자, 작업 흐름, 기술적 도전의 단서를 한 화면에서 확인합니다.</p>
      </div>
    </section>
  );
}
