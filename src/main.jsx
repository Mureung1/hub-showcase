import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import logoUrl from "../Logo-cropped.png";

const overviewItems = [
  ["대상", "프로젝트 경험을 쌓는 대학생 개발자"],
  ["문제", "프로젝트 종료 후 역할과 핵심 구현 내용을 잊어버림"],
  ["해결", "저장소를 분석해 회고와 포트폴리오 초안 생성"],
  ["형태", "GitHub Repository / 프로젝트 폴더 기반 AI Agent"],
];

const coreFeatures = [
  ["Repository 입력", "GitHub URL 또는 프로젝트 폴더를 입력합니다."],
  ["프로젝트 분석", "README, 폴더 구조, 주요 코드 파일을 확인합니다."],
  ["기술 스택 정리", "프레임워크, 라이브러리, 개발 도구를 추출합니다."],
  ["핵심 기능 요약", "프로젝트 목적과 주요 기능을 짧게 정리합니다."],
  ["회고 초안 생성", "어려웠던 점과 해결 과정을 문장으로 정리합니다."],
  ["역할 정리 템플릿", "내가 한 일, 배운 점, 기여 내용을 구분합니다."],
  ["Markdown 내보내기", "포트폴리오에 바로 옮길 수 있는 문서로 제공합니다."],
];

const futureFeatures = [
  ["커밋 기여도", "수정 파일과 작업 흐름을 기준으로 기여를 분석합니다."],
  ["PR/Issue 분석", "논의, 리뷰, 해결한 문제를 경험 자료로 정리합니다."],
  ["면접 답변 변환", "프로젝트 경험을 자기소개서와 면접 문장으로 바꿉니다."],
  ["어필 포인트 추출", "기술적 고민과 구현 포인트를 자동으로 찾습니다."],
  ["README 개선", "부족한 실행 방법, 기능 설명, 구조 설명을 제안합니다."],
  ["회고 템플릿", "KPT, 4L 등 여러 회고 형식으로 정리합니다."],
  ["프로젝트 시각화", "기간, 커밋 수, 기술 스택 비중을 보여줍니다."],
  ["프로젝트 비교", "여러 프로젝트 중 포트폴리오 우선순위를 추천합니다."],
  ["외부 내보내기", "Notion 또는 GitHub Pages로 결과를 연결합니다."],
];

function SectionHeading({ label, title }) {
  return (
    <div className="section-heading">
      <span className="section-label">{label}</span>
      <h2>{title}</h2>
    </div>
  );
}

function FeatureList({ items, compact = false }) {
  return (
    <ul className={`feature-list${compact ? " compact" : ""}`}>
      {items.map(([title, description]) => (
        <li key={title}>
          <strong className="feature-title">{title}</strong>
          <span className="feature-desc">{description}</span>
        </li>
      ))}
    </ul>
  );
}

function Overview() {
  return (
    <section className="overview" aria-label="프로젝트 개요">
      {overviewItems.map(([label, value]) => (
        <div className="overview-item" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function ProjectTopic() {
  return (
    <main className="page">
      <section className="intro">
        <h1 className="hero-logo">
          <img src={logoUrl} alt="PtoP Project to Portfolio 로고" />
        </h1>
      </section>

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
            대학생들은 동아리, 해커톤, 부트캠프, 개인 프로젝트를 통해 많은
            결과물을 만듭니다. 하지만 프로젝트가 끝나고 시간이 지나면 내가 맡은
            역할, 핵심 구현, 기술적 고민, 문제 해결 과정이 흐려집니다. 결국
            포트폴리오나 자기소개서를 작성할 때 다시 기억을 복원해야 하는 부담이
            생깁니다.
          </p>
        </article>

        <article className="panel solution-panel">
          <span className="section-label">03 Solution</span>
          <h2>해결 방안</h2>
          <p>
            사용자가 프로젝트 폴더나 GitHub Repository를 첨부하면 AI Agent가
            README, 코드 구조, 주요 파일을 분석합니다. 이후 프로젝트 목적, 기술
            스택, 핵심 기능, 나의 역할로 정리할 수 있는 내용을 Markdown 형태로
            제공합니다.
          </p>
        </article>
      </section>

      <section className="feature-section future-section">
        <SectionHeading label="04 Next" title="추가 핵심 기능 고려사항" />
        <FeatureList items={futureFeatures} compact />
      </section>

      <section className="closing">
        <span className="section-label">05 Summary</span>
        <h2>한 줄 소개</h2>
        <p>
          PtoP(Project to Portfolio)는 GitHub Repository나 프로젝트 폴더를
          분석해 대학생 개발자의 프로젝트 경험을 포트폴리오와 회고 형태로
          정리해주는 AI Agent 서비스.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ProjectTopic />
  </React.StrictMode>,
);
