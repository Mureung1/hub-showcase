import { useState, useEffect } from 'react';
import './ProjectIntro.css';

/* ===== SVG 아이콘 컴포넌트들 ===== */
const IconPlanner = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
  </svg>
);

const IconRole = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconMonitor = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconClipboard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);

const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconBell = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconRocket = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);


export default function ProjectIntro() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      id: 'planner',
      number: '01',
      icon: <IconPlanner />,
      title: '플래너 에이전트',
      description: '주제와 마감일을 입력하면 마일스톤과 태스크를 분해해 제안합니다. 팀은 수정과 승인을 통해 진행합니다.',
      points: ['주제·마감일 입력 → 마일스톤 자동 분해', '태스크 단위 제안 및 수정 가능', '팀 승인 후 프로젝트 진행'],
    },
    {
      id: 'role',
      number: '02',
      icon: <IconRole />,
      title: '역할 배정 에이전트',
      description: '각자 비공개로 제출한 작업 스타일 설문을 근거로 역할을 배정하고, 왜 그렇게 배정했는지 이유를 설명합니다.',
      points: ['비공개 작업 스타일 설문 수집', 'AI 기반 최적 역할 매칭', '배정 이유 투명하게 설명'],
    },
    {
      id: 'monitor',
      number: '03',
      icon: <IconMonitor />,
      title: '모니터링 에이전트',
      description: '진행 상황을 지켜보다 일정이 밀리면 재계획을 제안하고, 정체된 팀원에게는 조용히 리마인드를 보냅니다.',
      points: ['실시간 진행 상황 추적', '일정 지연 시 재계획 자동 제안', '정체 팀원에게 조용히 리마인드'],
    },
  ];

  const agentLoop = [
    {
      id: 'plan',
      icon: <IconClipboard />,
      label: '계획 수립',
      desc: '주제와 마감일에 따른 계획을 제안합니다',
    },
    {
      id: 'assign',
      icon: <IconUsers />,
      label: '역할 배정',
      desc: '사전 조사한 설문을 기반으로 역할을 배정해줍니다',
    },
    {
      id: 'monitor',
      icon: <IconBell />,
      label: '모니터링',
      desc: '진행 상황을 지켜보며 재계획, 리마인드, 역할 재조정을 제안합니다',
    },
  ];

  const badges = ['계획 자동 수립', '역할 자동 배정', '진행 모니터링'];

  return (
    <div className={`intro-wrapper ${isVisible ? 'visible' : ''}`}>
      {/* ===== HERO 섹션 ===== */}
      <section className="hero-section" id="hero">
        <div className="hero-badge">
          <IconRocket />
          <span>AI TEAM PROJECT MANAGEMENT</span>
        </div>

        <h1 className="hero-title">팀플이지</h1>

        <p className="hero-subtitle">
          팀플이지는 단순한 일정 관리 도구가 아니라,<br />
          <strong>계획 수립 → 역할 배정 → 모니터링</strong>을 통해<br />
          팀 프로젝트를 능동적으로 관리하는 서비스입니다.
        </p>

        <div className="hero-badges">
          {badges.map((badge) => (
            <span key={badge} className="badge-pill">
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* ===== 에이전트 루프 섹션 ===== */}
      <section className="loop-section" id="agent-loop">
        <div className="loop-card">
          <div className="loop-header">
            <span className="loop-label">Agent 작동 방식</span>
            <span className="loop-label-sub">계획 수립 → 역할 배정 → 모니터링</span>
          </div>

          <div className="loop-steps">
            {agentLoop.map((step, index) => (
              <div key={step.id} className="loop-step-item">
                <div className="loop-step-card">
                  <div className="loop-step-icon">{step.icon}</div>
                  <span className="loop-step-label-tag">{step.label}</span>
                  <p className="loop-step-desc">{step.desc}</p>
                </div>
                {index < agentLoop.length - 1 && (
                  <div className="loop-arrow">
                    <IconArrowRight />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 주요 기능 섹션 — 가로 풀너비 카드 ===== */}
      <section className="features-section" id="features">
        {features.map((feature) => (
          <div key={feature.id} className="feature-row">
            <div className="feature-row__left">
              <span className="feature-number">{feature.number}</span>
              <div className="feature-icon">{feature.icon}</div>
            </div>
            <div className="feature-row__body">
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>
            <ul className="feature-row__points">
              {feature.points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

    </div>
  );
}
