import { Button } from '@wanteddev/wds';

type LandingPageProps = {
  onStart: () => void;
};

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="onboarding-page" aria-labelledby="onboarding-title">
      <section className="onboarding-hero">
        <header className="onboarding-nav" aria-label="서비스 소개">
          <strong>아맞다</strong>
          <nav aria-label="온보딩 섹션">
            <a href="#problem">문제</a>
            <a href="#save-flow">저장</a>
            <a href="#retrieve-flow">꺼내보기</a>
          </nav>
        </header>

        <div className="onboarding-hero-grid">
          <div className="onboarding-copy">
            <p className="eyebrow">개인 인사이트 저장소</p>
            <h1 id="onboarding-title">
              저장한 링크를 필요한 순간 다시 꺼내보세요
            </h1>
            <p className="onboarding-description">
              아맞다는 흩어진 링크와 메모를 한곳에 모아두고, 나중에 지금
              필요한 상황에 맞게 다시 찾는 개인 인사이트 보관함입니다.
            </p>

            <div className="onboarding-actions">
              <Button
                color="primary"
                onClick={onStart}
                size="large"
                type="button"
              >
                서비스 경험하기
              </Button>
              <p>로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.</p>
            </div>
          </div>

          <OnboardingPreview />
        </div>
      </section>

      <section
        className="onboarding-section onboarding-problem-section"
        id="problem"
        aria-labelledby="onboarding-problem-title"
      >
        <div className="section-copy">
          <p className="eyebrow">Problem</p>
          <h2 id="onboarding-problem-title">
            저장해도 다시 찾기 어려웠던 이유
          </h2>
          <p>
            유용한 링크는 많이 저장하지만, 막상 다시 필요한 순간에는 제목,
            저장 위치, 정확한 키워드가 잘 떠오르지 않습니다.
          </p>
        </div>

        <div className="problem-grid">
          <article>
            <span>01</span>
            <h3>어디에 저장했는지 잊어요</h3>
            <p>
              북마크, 메신저, 메모 앱에 흩어진 자료가 다시 찾기를 어렵게
              합니다.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>검색어가 기억나지 않아요</h3>
            <p>
              필요한 건 떠오르지만, 저장 당시의 제목이나 키워드는 자주
              사라집니다.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>쓸 순간과 저장 순간이 달라요</h3>
            <p>
              저장할 때의 분류보다, 나중에 하려는 일이 더 중요한 단서가
              됩니다.
            </p>
          </article>
        </div>
      </section>

      <section
        className="onboarding-section onboarding-save-section"
        id="save-flow"
        aria-labelledby="onboarding-save-title"
      >
        <div className="flow-panel save-flow-panel">
          <div className="section-copy">
            <p className="eyebrow">Save</p>
            <h2 id="onboarding-save-title">저장은 빠르게, 정리는 나중에</h2>
            <p>
              좋은 자료를 발견했을 때는 URL과 짧은 메모만 먼저 남깁니다.
              카테고리와 정리는 필요해지는 순간에 해도 충분합니다.
            </p>
          </div>

          <div className="save-mockup" aria-label="저장 흐름 예시">
            <label htmlFor="onboarding-save-url">링크 URL</label>
            <div id="onboarding-save-url" className="mock-input">
              https://example.com/article
            </div>
            <label htmlFor="onboarding-save-memo">메모</label>
            <div id="onboarding-save-memo" className="mock-textarea">
              나중에 팀 프로젝트 첫 화면 만들 때 다시 보기
            </div>
            <div className="mock-save-result">
              <strong>저장 완료</strong>
              <span>카테고리와 메모는 나중에 조정할 수 있어요.</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="onboarding-section onboarding-retrieve-section"
        id="retrieve-flow"
        aria-labelledby="onboarding-retrieve-title"
      >
        <div className="section-copy">
          <p className="eyebrow">Retrieve</p>
          <h2 id="onboarding-retrieve-title">
            상황으로 다시 연결되는 꺼내보기
          </h2>
          <p>
            `팀 프로젝트 앱 첫 화면 참고`처럼 지금 하는 일을 입력하면,
            저장된 링크와 메모가 현재 상황에 가까운 작업팩으로 다시 모입니다.
          </p>
        </div>

        <OnboardingPreview />
      </section>

      <section
        className="onboarding-section onboarding-benefit-section"
        aria-labelledby="onboarding-benefit-title"
      >
        <div className="section-copy">
          <p className="eyebrow">Why it matters</p>
          <h2 id="onboarding-benefit-title">필요한 순간에 다시 꺼내는 방식</h2>
        </div>

        <div className="benefit-grid">
          <article>
            <h3>키워드보다 상황</h3>
            <p>정확한 제목을 몰라도 지금 하는 일로 자료를 다시 찾습니다.</p>
          </article>
          <article>
            <h3>정리 부담 감소</h3>
            <p>
              처음부터 완벽히 분류하지 않아도 저장과 재활용 흐름이 이어집니다.
            </p>
          </article>
          <article>
            <h3>작업으로 연결</h3>
            <p>
              과제, 팀 프로젝트, 공부, 포트폴리오 자료를 다시 실제 작업에
              씁니다.
            </p>
          </article>
        </div>
      </section>

      <section
        className="onboarding-final-cta"
        aria-labelledby="onboarding-final-title"
      >
        <p className="eyebrow">Start</p>
        <h2 id="onboarding-final-title">아맞다로 시작해보세요</h2>
        <p>
          저장한 링크가 나중의 나에게 다시 쓸모 있어지도록, 먼저 보관함을
          만들어보세요.
        </p>
        <Button color="primary" onClick={onStart} size="large" type="button">
          서비스 경험하기
        </Button>
      </section>
    </main>
  );
}

function OnboardingPreview() {
  return (
    <section className="onboarding-preview" aria-label="꺼내보기 미리보기">
      <div className="preview-situation">
        <span>지금 필요한 상황</span>
        <strong>팀 프로젝트 앱 첫 화면 참고</strong>
      </div>

      <div className="preview-source-list" aria-hidden="true">
        <div className="preview-source-card source-card-blue">
          <span>UX</span>
          <strong>모바일 온보딩 흐름</strong>
          <p>첫 화면의 선택 부담 줄이기</p>
        </div>
        <div className="preview-source-card source-card-green">
          <span>DEV</span>
          <strong>React 폼 구현 글</strong>
          <p>로그인 이후 입력 상태 관리</p>
        </div>
        <div className="preview-source-card source-card-amber">
          <span>PM</span>
          <strong>팀 프로젝트 기획서</strong>
          <p>데모 시나리오와 사용자 흐름</p>
        </div>
      </div>

      <div className="preview-pack">
        <p className="eyebrow">다시 볼 작업팩</p>
        <h2>현재 상황과 가까운 저장물 3개</h2>
        <ul>
          <li>메모에 비슷한 상황이 남아 있어요.</li>
          <li>팀 프로젝트 자료와 함께 보면 좋아요.</li>
          <li>첫 화면 흐름을 잡을 때 바로 열 수 있어요.</li>
        </ul>
      </div>
    </section>
  );
}
