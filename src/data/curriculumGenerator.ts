export type CurriculumSource = {
  title: string
  type: 'official_docs' | 'practice_guide'
  urlLabel: string
}

export type GeneratedCurriculumStep = {
  id: string
  title: string
  detail: string
  outcome: string
  durationLabel: string
}

export type GeneratedCurriculumPlan = {
  id: string
  goal: string
  title: string
  summary: string
  estimatedDuration: string
  focusRole: string
  todayMission: {
    title: string
    detail: string
    durationMinutes: number
    fileName: string
  }
  steps: GeneratedCurriculumStep[]
  sources: CurriculumSource[]
}

const fallbackGoal = '새 기술을 실무에 적용하고 싶어'

const curriculumPlans = {
  devops: {
    id: 'devops-engineer-roadmap',
    title: 'DevOps 엔지니어 필수 커리큘럼',
    summary: '운영 기본기부터 컨테이너, CI/CD, IaC까지 실무 배포 흐름을 순서대로 학습합니다.',
    estimatedDuration: '4주 입문 로드맵',
    focusRole: 'DevOps / Platform Engineer',
    todayMission: {
      title: 'Linux와 Shell 기본기 점검',
      detail: '파일 권한, 프로세스 확인, 로그 탐색 명령을 실습합니다.',
      durationMinutes: 35,
      fileName: 'ops-checklist.sh',
    },
    steps: [
      {
        id: 'linux-shell',
        title: 'Linux와 Shell 기본기',
        detail: '파일 시스템, 권한, 프로세스, Bash 자동화를 먼저 익힙니다.',
        outcome: '서버에 접속해 상태를 점검하고 반복 작업을 스크립트로 정리할 수 있습니다.',
        durationLabel: 'Week 1',
      },
      {
        id: 'network-observability',
        title: '네트워크와 운영 기초',
        detail: 'HTTP, DNS, TCP/IP, 로그 확인과 장애 추적 흐름을 학습합니다.',
        outcome: '서비스 장애가 네트워크, 애플리케이션, 인프라 중 어디에서 시작됐는지 좁힐 수 있습니다.',
        durationLabel: 'Week 1-2',
      },
      {
        id: 'container-deploy',
        title: '컨테이너와 배포',
        detail: 'Docker 이미지, Compose, 환경 변수, 배포 단위를 이해합니다.',
        outcome: '간단한 앱을 컨테이너로 묶고 로컬/서버에서 같은 방식으로 실행할 수 있습니다.',
        durationLabel: 'Week 2-3',
      },
      {
        id: 'ci-iac-monitoring',
        title: 'CI/CD와 IaC',
        detail: 'GitHub Actions, Terraform 기본 개념, 모니터링 입문을 연결합니다.',
        outcome: '코드 변경부터 배포, 인프라 변경, 상태 확인까지 한 흐름으로 설명할 수 있습니다.',
        durationLabel: 'Week 4',
      },
    ],
    sources: [
      { title: 'Linux Command Line Basics', type: 'practice_guide', urlLabel: 'linux.org docs' },
      { title: 'Docker Get Started', type: 'official_docs', urlLabel: 'docs.docker.com' },
      { title: 'GitHub Actions Documentation', type: 'official_docs', urlLabel: 'docs.github.com' },
    ],
  },
  react: {
    id: 'react-foundation-roadmap',
    title: 'React UI 개발 커리큘럼',
    summary: '컴포넌트, props, state, 이벤트를 작은 실습으로 이어가며 UI 사고방식을 익힙니다.',
    estimatedDuration: '5일 입문 코스',
    focusRole: 'Frontend Developer',
    todayMission: {
      title: 'Counter 컴포넌트 실습',
      detail: 'useState와 onClick을 연결해 화면이 사용자 행동에 반응하게 만듭니다.',
      durationMinutes: 30,
      fileName: 'Counter.jsx',
    },
    steps: [
      {
        id: 'component-model',
        title: '컴포넌트 구조',
        detail: '화면을 재사용 가능한 단위로 나누는 기준을 배웁니다.',
        outcome: '작은 UI를 컴포넌트로 분리할 수 있습니다.',
        durationLabel: 'Day 1',
      },
      {
        id: 'props-state',
        title: 'props와 state',
        detail: '외부에서 받는 값과 내부에서 바뀌는 값을 구분합니다.',
        outcome: '상태가 필요한 UI와 필요 없는 UI를 구분할 수 있습니다.',
        durationLabel: 'Day 2',
      },
      {
        id: 'events',
        title: '이벤트 처리',
        detail: '클릭과 입력 이벤트가 상태 변경으로 이어지는 흐름을 익힙니다.',
        outcome: '간단한 상호작용 UI를 구현할 수 있습니다.',
        durationLabel: 'Day 3',
      },
      {
        id: 'practice-review',
        title: '실습과 리뷰',
        detail: '작은 미션을 실행하고 실패 원인을 정리합니다.',
        outcome: '코드를 실행 결과와 연결해 설명할 수 있습니다.',
        durationLabel: 'Day 4-5',
      },
    ],
    sources: [
      { title: 'React: State as a Snapshot', type: 'official_docs', urlLabel: 'react.dev' },
      { title: 'React: Responding to Events', type: 'official_docs', urlLabel: 'react.dev' },
    ],
  },
  fastapi: {
    id: 'fastapi-api-roadmap',
    title: 'FastAPI 백엔드 입문 커리큘럼',
    summary: '라우팅, 요청/응답, 검증, 문서화를 작은 API 실습으로 연결합니다.',
    estimatedDuration: '2주 입문 로드맵',
    focusRole: 'Backend Developer',
    todayMission: {
      title: '첫 GET API 만들기',
      detail: '학습 주제를 URL로 받아 JSON 응답을 반환합니다.',
      durationMinutes: 30,
      fileName: 'main.py',
    },
    steps: [
      {
        id: 'route-basics',
        title: 'API 기본 구조',
        detail: '앱 인스턴스, 라우트, 핸들러의 역할을 이해합니다.',
        outcome: '가장 작은 GET 엔드포인트를 만들 수 있습니다.',
        durationLabel: 'Day 1-2',
      },
      {
        id: 'path-query',
        title: 'Path와 Query',
        detail: 'URL에서 값을 받고 타입을 검증하는 흐름을 학습합니다.',
        outcome: '요청 값을 함수 인자로 안전하게 받을 수 있습니다.',
        durationLabel: 'Day 3-4',
      },
      {
        id: 'pydantic-model',
        title: '요청 모델 검증',
        detail: 'Pydantic 모델로 입력 구조를 명확히 정의합니다.',
        outcome: '잘못된 요청을 자동으로 막고 오류를 읽을 수 있습니다.',
        durationLabel: 'Day 5-7',
      },
      {
        id: 'docs-test',
        title: '문서화와 테스트',
        detail: '자동 문서와 테스트 클라이언트로 API 동작을 확인합니다.',
        outcome: 'API 동작을 문서와 테스트로 검증할 수 있습니다.',
        durationLabel: 'Week 2',
      },
    ],
    sources: [
      { title: 'FastAPI First Steps', type: 'official_docs', urlLabel: 'fastapi.tiangolo.com' },
      { title: 'FastAPI Path Parameters', type: 'official_docs', urlLabel: 'fastapi.tiangolo.com' },
    ],
  },
} satisfies Record<string, Omit<GeneratedCurriculumPlan, 'goal'>>

export function generateMockCurriculum(goal: string): GeneratedCurriculumPlan {
  const normalizedGoal = goal.trim() || fallbackGoal
  const key = resolvePlanKey(normalizedGoal)
  const plan = curriculumPlans[key]

  return {
    ...plan,
    goal: normalizedGoal,
  }
}

function resolvePlanKey(goal: string): keyof typeof curriculumPlans {
  const lowerGoal = goal.toLowerCase()

  if (/(devops|dev ops|데브옵스|인프라|sre|platform|플랫폼)/i.test(lowerGoal)) {
    return 'devops'
  }

  if (/(react|리액트|frontend|프론트)/i.test(lowerGoal)) {
    return 'react'
  }

  if (/(fastapi|api|backend|백엔드)/i.test(lowerGoal)) {
    return 'fastapi'
  }

  return 'react'
}
