import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function ProjectIntro() {
  const painPoints = [
    '근무표 확인이 어려움',
    '대타 요청 및 승인 과정이 번거로움',
    '근무 가능 시간 파악이 어려움',
    '근무시간 집계 및 급여 계산이 번거로움',
    '스케줄 변경 내역 추적이 어려움',
  ];

  const features = [
    '일정 공유',
    '대타 승인',
    '근무 가능 시간',
    '근무 집계',
    '급여 자동 계산',
  ];

  return (
    <main className="page">
      <section className="intro">
        <div className="intro__content">
          <p className="intro__eyebrow">소규모 매장을 위한 웹 서비스</p>
          <h1>근무표 관리 서비스</h1>
          <p className="intro__description">
            카페, 음식점, 편의점처럼 바쁜 현장에서 사장님과 아르바이트생이 근무 일정,
            대타 요청, 근무 가능 시간, 급여 계산을 한 곳에서 간편하게 관리하도록 돕는 서비스입니다.
          </p>
          <div className="intro__actions" aria-label="핵심 기능">
            {features.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
        </div>

        <aside className="intro__panel" aria-label="현재 매장의 불편함">
          <h2>해결하려는 문제</h2>
          <ul>
            {painPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProjectIntro />
  </React.StrictMode>,
);
