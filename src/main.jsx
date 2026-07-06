import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import logoUrl from '../Logo.png';

function ProjectTopic() {
  const overview = [
    ['대상', '프로젝트 경험을 쌓는 대학생 개발자'],
    ['문제', '프로젝트 종료 후 역할과 핵심 구현 내용을 잊어버림'],
    ['해결', '저장소를 분석해 회고와 포트폴리오 초안 생성'],
    ['형태', 'GitHub Repository / 프로젝트 폴더 기반 AI Agent']
  ];

  const coreFeatures = [
    'GitHub Repository URL 또는 프로젝트 폴더 입력',
    'README, 폴더 구조, 주요 코드 파일 분석',
    '프로젝트 목적과 핵심 기능 요약',
    '사용한 기술 스택 자동 정리',
    '포트폴리오에 활용할 수 있는 회고 초안 생성',
    '내가 한 일, 어려웠던 점, 해결 과정, 배운 점 템플릿 제공',
    'Markdown 파일 형태로 결과 내보내기'
  ];

  const futureFeatures = [
    '커밋 기반 기여도 분석',
    'PR, Issue, 리뷰 코멘트 분석',
    '자기소개서와 면접 답변 형태로 변환',
    '기술적 고민과 어필 포인트 자동 추출',
    'README 개선 제안',
    'KPT, 4L 등 회고 템플릿 자동 생성',
    '프로젝트 기간, 커밋 수, 기술 스택 비중 시각화',
    '여러 프로젝트 비교 후 포트폴리오 우선순위 추천',
    'Notion 또는 GitHub Pages 내보내기'
  ];

  return (
    <main className="page">
      <section className="intro">
        <div>
          <p className="eyebrow">대학생이 겪는 문제 해결</p>
          <h1 className="hero-logo">
            <img src={logoUrl} alt="PtoP Project to Portfolio 로고" />
          </h1>
        </div>
        <p className="summary">
          Project to Portfolio.
          대학생 개발자가 빠르게 쌓아가는 프로젝트 경험을 잊어버리기 전에 정리해주는
          AI 기반 프로젝트 회고 및 포트폴리오 초안 생성 서비스입니다.
        </p>
      </section>

      <section className="overview" aria-label="프로젝트 개요">
        {overview.map(([label, value]) => (
          <div className="overview-item" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="feature-section core-section">
        <div className="section-heading">
          <span className="section-label">01 Core Features</span>
          <h2>4주 동안 우선 만들 핵심 기능</h2>
        </div>
        <ul className="feature-list">
          {coreFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="content-grid" aria-label="프로젝트 주제 소개">
        <article className="panel problem-panel">
          <span className="section-label">02 Problem</span>
          <h2>프로젝트는 많아지지만, 정리는 뒤로 밀립니다.</h2>
          <p>
            대학생들은 동아리, 해커톤, 부트캠프, 개인 프로젝트를 통해 많은 결과물을
            만듭니다. 하지만 프로젝트가 끝나고 시간이 지나면 내가 맡은 역할, 핵심 구현,
            기술적 고민, 문제 해결 과정이 흐려집니다. 결국 포트폴리오나 자기소개서를
            작성할 때 다시 기억을 복원해야 하는 부담이 생깁니다.
          </p>
        </article>

        <article className="panel solution-panel">
          <span className="section-label">03 Solution</span>
          <h2>Repository를 넣으면 경험 정리 초안을 만들어줍니다.</h2>
          <p>
            사용자가 프로젝트 폴더나 GitHub Repository를 첨부하면 AI Agent가 README,
            코드 구조, 주요 파일을 분석합니다. 이후 프로젝트 목적, 기술 스택, 핵심 기능,
            나의 역할로 정리할 수 있는 내용을 Markdown 형태로 제공합니다.
          </p>
        </article>
      </section>

      <section className="feature-section muted">
        <div className="section-heading">
          <span className="section-label">04 Next</span>
          <h2>추가 핵심 기능 고려사항</h2>
        </div>
        <ul className="feature-list compact">
          {futureFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="closing">
        <span className="section-label">05 Summary</span>
        <h2>한 줄 소개</h2>
        <p>
          PtoP(Project to Portfolio)는 GitHub Repository나 프로젝트 폴더를 분석해 대학생 개발자의 프로젝트 경험을
          포트폴리오와 회고 형태로 정리해주는 AI Agent 서비스.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProjectTopic />
  </React.StrictMode>
);
