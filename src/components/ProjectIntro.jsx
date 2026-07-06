import { useState } from 'react';
import './ProjectIntro.css';

/* ─── 하드코딩 데이터 ─── */

const PROBLEMS = [
  {
    icon: '📱',
    iconClass: 'red',
    title: '앱 파편화',
    desc: '할 일은 리마인더, 일정은 캘린더, 운동은 운동 앱, 식단은 또 다른 앱. 앱을 오가다 결국 아무것도 안 쓰게 된다.',
  },
  {
    icon: '😮‍💨',
    iconClass: 'amber',
    title: '입력이 귀찮다',
    desc: '일정 하나 넣는 데 날짜 선택, 시간 설정, 반복 여부까지 폼을 채워야 한다. 기록은 "귀찮은 순간"에 무너진다.',
  },
  {
    icon: '📊',
    iconClass: 'blue',
    title: '해석 없는 데이터',
    desc: '캘린더는 나열만 할 뿐, "이번 주 내가 어떻게 살았는지" 말해주지 않는다.',
  },
];

const COMPARISON = [
  { category: '입력', old: '폼 채우기 (앱별로 따로)', briefy: '한 입력창에 자연어 한 줄 — 텍스트 또는 음성' },
  { category: '분류', old: '사람이 앱을 골라서 들어감', briefy: 'AI가 의도를 파악해 자동 분류' },
  { category: '애매할 때', old: '처리 불가', briefy: 'AI가 선택지를 제시하며 되물음' },
  { category: '확인', old: '앱마다 따로 조회', briefy: '오늘 화면 하나 + 아침 브리핑' },
  { category: '회고', old: '없음', briefy: '주간 리포트 자동 생성' },
];

const AI_ROLES = [
  {
    icon: '🧠',
    title: '자연어 파싱',
    desc: '"다음주 화요일 오후 치과" → 일정 + 리마인더 + 카테고리를 구조화된 JSON으로 변환',
  },
  {
    icon: '🤔',
    title: '의도 명확화 (되묻기)',
    desc: '"운동해야 함"처럼 모호한 입력 → 선택지 버튼으로 되물어 정확한 의도 파악',
  },
  {
    icon: '☀️',
    title: '하루 브리핑',
    desc: '할 일 + 루틴 + 어제 기록을 종합해 아침에 한 문단으로 요약하여 전달',
  },
  {
    icon: '📈',
    title: '주간 리포트',
    desc: '달성률 + 패턴 발견 — "금요일마다 운동을 빼먹네요" 같은 인사이트 제공',
  },
];

const DEMO_EXAMPLES = [
  {
    sentence: '다음주 화요일 오후 치과, 전날 알려줘',
    results: [
      {
        type: 'schedule',
        typeLabel: '일정',
        title: '치과 방문',
        detail: '📅 다음주 화요일 오후\n📍 카테고리: 의료',
      },
      {
        type: 'reminder',
        typeLabel: '리마인더',
        title: '치과 전날 알림',
        detail: '🔔 다음주 월요일 알림\n💬 "내일 오후 치과 예약이 있어요"',
      },
    ],
  },
  {
    sentence: '금요일까지 팀플 자료 만들기',
    results: [
      {
        type: 'todo',
        typeLabel: '할 일',
        title: '팀플 자료 만들기',
        detail: '📋 마감: 이번 주 금요일\n🏷️ 카테고리: 학업',
      },
    ],
  },
  {
    sentence: '운동',
    results: [
      {
        type: 'clarify',
        typeLabel: '되묻기',
        title: '"운동"이 어떤 의미인가요?',
        detail: '입력이 모호해서 확인이 필요해요.',
        options: ['💪 오늘 할 일에 추가', '✅ 운동 완료 기록', '🔄 새 루틴 추가'],
      },
    ],
  },
];

const SCENARIOS = [
  {
    time: '🌅 아침',
    title: '앱을 열면 브리핑',
    desc: '"오늘 마감 2개, 수요일이라 하체 운동 날, 영어 스트릭 4일째"',
  },
  {
    time: '🚶 등굣길',
    title: '걸으면서 음성 입력',
    desc: '🎤 버튼 누르고 "금요일까지 팀플 자료 만들기"라고 말하면 끝 — 자동으로 할 일에 저장',
  },
  {
    time: '🌤️ 낮에 생각날 때',
    title: '한 줄 입력으로 일정 생성',
    desc: '"다음주 화요일 오후 치과, 전날 알려줘" → 일정 + 리마인더 동시 생성',
  },
  {
    time: '🤷 애매한 입력',
    title: 'AI가 선택지를 제시',
    desc: '"운동" 입력 → "오늘 할 일 / 운동 완료 기록 / 루틴 추가" 버튼 제시 → 탭 한 번으로 확정',
  },
  {
    time: '🌙 저녁',
    title: '루틴 체크',
    desc: '오늘 한 루틴을 자연어 또는 체크박스로 간편하게 완료 처리',
  },
  {
    time: '📊 일요일 밤',
    title: '주간 리포트 확인',
    desc: '달성률과 패턴 피드백으로 한 주를 돌아보기',
  },
];

const ROADMAP = [
  {
    week: '1주차',
    title: '자연어 파서 + 할 일/일정 CRUD',
    output: '한 줄 입력으로 할 일이 저장되는 데모',
  },
  {
    week: '2주차',
    title: '루틴 + 되묻기 UX + 음성 입력',
    output: '반복 루틴, 스트릭, 모호 입력 처리, 음성 입력',
  },
  {
    week: '3주차',
    title: '오늘 뷰 대시보드 + 하루 브리핑',
    output: '아침 브리핑이 생성되는 화면',
  },
  {
    week: '4주차',
    title: '주간 리포트 + 다듬기 + 발표',
    output: '완성 데모 + 발표 자료',
  },
];

/* ─── 컴포넌트 ─── */

export default function ProjectIntro() {
  const [selectedDemo, setSelectedDemo] = useState(0);

  return (
    <div className="project-intro">
      {/* ───── 1. 히어로 ───── */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">🚀 4주 프로젝트</span>
          <h1 className="hero-title">Briefy</h1>
          <p className="hero-slogan">
            말하면 정리되고, 아침이면 브리핑되는
            <br />
            나의 라이프 매니저
          </p>
          <div className="hero-chips">
            <span className="hero-chip">📝 할 일</span>
            <span className="hero-chip">📅 일정</span>
            <span className="hero-chip">💪 운동 루틴</span>
            <span className="hero-chip">📖 공부 루틴</span>
            <span className="hero-chip">🍽️ 식단</span>
          </div>
        </div>
      </section>

      {/* ───── 2. 문제 정의 ───── */}
      <section className="section problems-section">
        <span className="section-label">Problem</span>
        <h2 className="section-title">
          대학생의 자기관리,
          <br />
          왜 매번 실패할까?
        </h2>
        <p className="section-desc">
          관리할 게 많은 대학생 — 수업 과제, 자격증 공부, 운동, 식단, 어학.
          앱은 많지만 진짜 문제는 따로 있습니다.
        </p>
        <div className="problems-grid">
          {PROBLEMS.map((p, i) => (
            <div className="problem-card" key={i}>
              <div className={`problem-icon ${p.iconClass}`}>{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── 3. 솔루션 비교 ───── */}
      <section className="section solution-section">
        <span className="section-label">Solution</span>
        <h2 className="section-title">
          기존 앱 vs Briefy
        </h2>
        <p className="section-desc">
          입력과 해석을 AI에 맡긴 라이프 매니저. 하나의 입력창으로 모든 것을 관리합니다.
        </p>
        <div className="table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>기존 앱</th>
                <th>✨ Briefy</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i}>
                  <td>{row.category}</td>
                  <td>{row.old}</td>
                  <td>
                    <span className="briefy-highlight">{row.briefy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───── 4. AI의 역할 ───── */}
      <section className="section ai-section">
        <span className="section-label">AI Features</span>
        <h2 className="section-title">AI가 하는 일</h2>
        <p className="section-desc">
          저장·조회는 일반 앱과 같지만, 들어가는 문(자연어·음성 파싱)과
          나오는 문(브리핑·리포트)이 AI입니다.
        </p>
        <div className="ai-grid">
          {AI_ROLES.map((role, i) => (
            <div className="ai-card" key={i}>
              <div className="ai-icon">{role.icon}</div>
              <h3>{role.title}</h3>
              <p>{role.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── 5. 입력 데모 미리보기 ───── */}
      <section className="section demo-section">
        <span className="section-label">Demo</span>
        <h2 className="section-title">입력 한 줄이면 끝</h2>
        <p className="section-desc">
          아래 예시 문장을 클릭해보세요. AI가 어떻게 파싱하는지 확인할 수 있습니다.
        </p>
        <div className="demo-container">
          {/* 예시 버튼 */}
          <div className="demo-input-area">
            <p className="demo-input-label">💡 예시 문장을 선택하세요</p>
            <div className="demo-buttons">
              {DEMO_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className={`demo-btn${selectedDemo === i ? ' active' : ''}`}
                  onClick={() => setSelectedDemo(i)}
                >
                  "{ex.sentence}"
                </button>
              ))}
            </div>
          </div>

          {/* 입력 모큡 */}
          <div className="demo-mockup">
            <div className="demo-mockup-icon">✏️</div>
            <span className="demo-mockup-text">
              {DEMO_EXAMPLES[selectedDemo].sentence}
            </span>
          </div>

          {/* 파싱 결과 */}
          <div className="demo-result-area">
            <p className="demo-result-label">✅ 파싱 결과</p>
            <div className="demo-cards">
              {DEMO_EXAMPLES[selectedDemo].results.map((r, i) => (
                <div className="demo-card" key={i}>
                  <span className={`demo-card-type ${r.type}`}>
                    {r.typeLabel}
                  </span>
                  <h4>{r.title}</h4>
                  <p style={{ whiteSpace: 'pre-line' }}>{r.detail}</p>
                  {r.options && (
                    <div className="demo-card-options">
                      {r.options.map((opt, j) => (
                        <button className="demo-option-btn" key={j}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── 6. 핵심 사용자 시나리오 ───── */}
      <section className="section scenario-section">
        <span className="section-label">User Scenario</span>
        <h2 className="section-title">하루 흐름으로 보는 Briefy</h2>
        <p className="section-desc">
          아침 브리핑부터 주간 리포트까지, Briefy와 함께하는 하루를 소개합니다.
        </p>
        <div className="scenario-timeline">
          {SCENARIOS.map((s, i) => (
            <div className="scenario-item" key={i}>
              <div className="scenario-dot" />
              <div className="scenario-content">
                <span className="scenario-time">{s.time}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── 7. 4주 로드맵 ───── */}
      <section className="section roadmap-section">
        <span className="section-label">Roadmap</span>
        <h2 className="section-title">4주 개발 계획</h2>
        <p className="section-desc">
          P0(할 일·일정)을 먼저 완성하고, 루틴·브리핑·리포트 순으로 확장합니다.
        </p>
        <div className="roadmap-grid">
          {ROADMAP.map((r, i) => (
            <div className="roadmap-card" key={i}>
              <span className="roadmap-week">{r.week}</span>
              <h3>{r.title}</h3>
              <p>{r.output}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="project-footer">
        <p className="footer-text">
          <strong>Briefy</strong> · 입력은 짧게, 확인은 브리핑으로 · 2026
        </p>
      </footer>
    </div>
  );
}
