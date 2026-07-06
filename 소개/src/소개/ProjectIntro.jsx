import './ProjectIntro.css'

const CORE_MECHANICS = [
  {
    title: '정체 감지',
    description:
      '마지막으로 진행 기록을 남긴 지 일정 기간이 지나면, 항목은 자동으로 "정체 중"으로 표시됩니다. 조용히 방치되고 잊히는 대신, "계속할까, 접을까"를 그때그때 마주하게 됩니다.',
  },
  {
    title: '회고',
    description:
      '완주했든 중간에 접었든, 짧은 이유를 남겨야 항목을 닫을 수 있습니다. 이렇게 쌓인 회고를 모아보면 내가 보통 어디서 놓는지 — 나만의 패턴이 보이기 시작합니다.',
  },
]

const CORE_FEATURES = [
  {
    title: '항목 등록',
    description: '이름, 유형, 전체 분량, 시작일을 적어 새 항목을 만듭니다.',
  },
  {
    title: '진행 기록',
    description:
      '"3강 들음"처럼 이번에 진행한 만큼만 기록하면 진행률이 자동으로 계산됩니다.',
  },
  {
    title: '상태 관리',
    description: '진행중 · 정체 · 완료 · 중단, 네 가지 상태로 항목을 구분합니다.',
  },
  {
    title: '정체 자동 감지',
    description: '마지막 진행 이후 일정 기간이 지나면 자동으로 정체 상태를 표시합니다.',
  },
  {
    title: '회고 작성',
    description: '완료 또는 중단 시점에 짧은 회고를 남깁니다.',
  },
  {
    title: '대시보드',
    description: '진행중 · 정체중 · 히스토리를 한눈에 봅니다.',
  },
  {
    title: '회고 모아보기',
    description: '남긴 회고들을 모아, 나의 미완성 패턴을 훑어봅니다.',
  },
]

const SCREENS = [
  {
    path: '/',
    title: '홈 대시보드',
    description: '진행중, 정체중, 완료·중단 히스토리를 요약해서 보여줍니다.',
  },
  {
    path: '/item/[id]',
    title: '항목 상세',
    description: '진행 기록 타임라인, 진행률, 회고를 확인합니다.',
  },
  {
    path: '/item/new',
    title: '항목 추가',
    description: '이름 · 유형 · 전체 분량 · 시작일을 입력해 새 항목을 등록합니다.',
  },
  {
    path: '/retrospectives',
    title: '회고 모아보기',
    description: '완료 · 중단 항목의 회고를 모아서 보여줍니다. 이 앱의 킬러 화면입니다.',
  },
]

const NON_GOALS = [
  '소셜 / 공유 기능',
  '푸시 알림',
  '화려한 통계 차트 · 그래프',
  '로그인 / 멀티 디바이스 동기화',
  '협업, 다중 사용자',
]

function ProjectIntro() {
  return (
    <main className="project-intro">
      <section className="project-intro-hero">
        <p className="project-intro-eyebrow">가칭</p>
        <h1 className="project-intro-title">미완성 추적기</h1>
        <p className="project-intro-description">
          시작만 하고 끝내지 못한 것들 — 사이드 프로젝트, 완강 못 한 인강,
          덮어둔 책 — 의 진행률과 회고를 기록합니다.
        </p>
        <p className="project-intro-note">할 일 목록 앱이 아닙니다.</p>
      </section>

      <section className="project-intro-section">
        <h2 className="project-intro-heading">핵심은 이 두 가지뿐입니다</h2>
        <ul className="project-intro-mechanics">
          {CORE_MECHANICS.map((mechanic) => (
            <li key={mechanic.title}>
              <h3>{mechanic.title}</h3>
              <p>{mechanic.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="project-intro-section">
        <h2 className="project-intro-heading">담을 기능</h2>
        <ul className="project-intro-feature-list">
          {CORE_FEATURES.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="project-intro-section">
        <h2 className="project-intro-heading">화면 구성</h2>
        <ol className="project-intro-screens">
          {SCREENS.map((screen) => (
            <li key={screen.path}>
              <code>{screen.path}</code>
              <h3>{screen.title}</h3>
              <p>{screen.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="project-intro-section">
        <h2 className="project-intro-heading">일부러 안 만드는 것</h2>
        <ul className="project-intro-non-goals">
          {NON_GOALS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="project-intro-note">
          기능을 더하고 싶어질 때마다, 이 목록부터 다시 봅니다.
        </p>
      </section>

      <footer className="project-intro-footer">
        <p>
          완주가 최우선입니다. 배포되고, 실제로 내가 쓰고, 회고가 하나라도
          쌓이면 — 이 프로젝트는 성공입니다.
        </p>
      </footer>
    </main>
  )
}

export default ProjectIntro
