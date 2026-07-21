import React from "react";

const features = [
  { icon: "💡", text: "아이디어 브레인스토밍 지원" },
  { icon: "🌍", text: "세계관 및 스토리 설정 도우미" },
  { icon: "🎮", text: "캐릭터 및 시스템 기획 가이드" },
  { icon: "📝", text: "기획서 문서 자동 정리 및 생성" },
  { icon: "🛠️", text: "기획 이후 개발 진행 지원" },
];

export default function ProjectIntro() {
  return (
    <section className="project-intro">
      <span className="badge">AI 에이전트 · 기획부터 개발까지</span>
      <h1>게임 기획 도우미 AI 에이전트</h1>
      <p className="lead">
        게임 개발의 <strong>기획 단계부터 개발까지</strong> 함께하는 AI
        에이전트를 만드는 프로젝트입니다. 아이디어 구상, 세계관 설정, 캐릭터
        디자인, 게임 시스템 설계는 물론 실제 개발 진행까지 막막함을
        덜어주는 것을 목표로 합니다.
      </p>

      <div className="features">
        <h2>주요 기능 (예정)</h2>
        <ul>
          {features.map((f) => (
            <li key={f.text}>
              <span className="icon" aria-hidden="true">
                {f.icon}
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
