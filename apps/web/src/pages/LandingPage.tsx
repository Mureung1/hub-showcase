import { DemoPreview } from "../components/DemoPreview";
import { FeatureList } from "../components/FeatureList";
import { LandingHero } from "../components/LandingHero";
import { Overview } from "../components/Overview";
import { ResourceLinks } from "../components/ResourceLinks";
import { SectionHeading } from "../components/SectionHeading";
import { WorkflowSection } from "../components/WorkflowSection";
import { coreFeatures, futureFeatures } from "../data/landingContent";
type LandingPageProps = {
  onEnterWorkspace: () => void;
};

export function LandingPage({ onEnterWorkspace }: LandingPageProps) {
  return (
    <>
      <LandingHero onEnterWorkspace={onEnterWorkspace} />
      <DemoPreview />
      <WorkflowSection />

      <Overview />

      <section className="feature-section core-section">
        <SectionHeading label="01 Core Features" title="핵심 기능" />
        <FeatureList items={coreFeatures} />
      </section>

      <section className="content-grid" aria-label="프로젝트 주제 소개">
        <article className="panel">
          <span className="section-label">02 Problem</span>
          <h2>문제 정의</h2>
          <p>
            대학생들은 동아리, 해커톤, 부트캠프, 개인 프로젝트를 통해 많은 결과물을 만듭니다. 하지만 프로젝트가
            끝나고 시간이 지나면 내가 맡은 역할, 핵심 구현, 기술적 고민, 문제 해결 과정이 흐려집니다. 결국
            포트폴리오나 자기소개서를 작성할 때 다시 기억을 복원해야 하는 부담이 생깁니다.
          </p>
        </article>

        <article className="panel solution-panel">
          <span className="section-label">03 Solution</span>
          <h2>해결 방안</h2>
          <p>
            사용자가 프로젝트 폴더나 GitHub Repository를 첨부하면 AI Agent가 README, 코드 구조, 주요 파일을
            분석합니다. 이후 프로젝트 목적, 기술 스택, 핵심 기능, 나의 역할로 정리할 수 있는 내용을 Markdown 형태로
            제공합니다.
          </p>
        </article>
      </section>

      <section className="feature-section future-section">
        <SectionHeading label="04 Next" title="추가 핵심 기능 고려사항" />
        <FeatureList items={futureFeatures} compact />
      </section>

      <ResourceLinks />

      <section className="closing">
        <span className="section-label">06 Summary</span>
        <h2>한 줄 소개</h2>
        <p>
          PtoP(Project to Portfolio)는 GitHub Repository나 프로젝트 폴더를 분석해 대학생 개발자의 프로젝트 경험을
          포트폴리오와 회고 형태로 정리해주는 AI Agent 서비스.
        </p>
      </section>
    </>
  );
}
