// ─────────────────────────────────────────────────────────────
//  커리어 코파일럿 — 예시 데이터 + 가공 로직 (Claude Design 이식)
//  원본은 테마 객체로 색을 넣었지만, 여기선 CSS 변수(var(--x))로 바꿔
//  테마 독립적으로 한 번만 가공한다. (테마 전환 시 재계산 불필요)
// ─────────────────────────────────────────────────────────────

// 4등급 상태 → 라벨 + 색(CSS 변수)
function statusInfo(status) {
  const map = {
    strong: { label: '강점', color: 'var(--blue-bright)', dot: 'var(--blue-bright)' },
    ok: { label: '기본', color: 'var(--blue-med)', dot: 'var(--blue-med)' },
    weak: { label: '근거부족', color: 'var(--text-dim)', dot: 'var(--text-faint)' },
    gap: { label: '미보유', color: 'var(--coral)', dot: 'var(--coral)' },
  }
  return map[status]
}

// 근거 태그 종류 → 색 + 테두리
function tag(label, type) {
  const map = {
    wiki: { color: 'var(--blue-bright)', border: '1px solid rgba(var(--blue-bright-rgb),0.35)' },
    repo: { color: 'var(--blue-med)', border: '1px solid rgba(var(--blue-med-rgb),0.35)' },
    self: { color: 'var(--text-dim)', border: '1px solid var(--border)' },
    gap: { color: 'var(--coral)', border: '1px dashed rgba(var(--coral-rgb),0.4)' },
  }
  return { label, ...map[type] }
}

// 티어 → 색 + 배경
function tierInfo(tier) {
  const map = {
    green: { color: 'var(--blue-bright)', bg: 'rgba(var(--blue-bright-rgb),0.22)' },
    yellow: { color: 'var(--blue-med)', bg: 'rgba(var(--blue-med-rgb),0.22)' },
    red: { color: 'var(--coral)', bg: 'rgba(var(--coral-rgb),0.18)' },
  }
  return map[tier]
}

// 요구역량 하나를 화면용으로 가공 (근거 유무·AI바·태그·액션)
function enrichReq(r) {
  const s = statusInfo(r.status)
  const defaultActionLabel = r.status === 'gap' ? '→ 채우기' : r.status === 'weak' ? '→ 검증' : '→ 강점으로'
  return {
    name: r.name,
    label: s.label,
    color: s.color,
    dot: s.dot,
    hasEvidence: !!r.why,
    why: r.why || '',
    tags: (r.tags || []).map(([label, type]) => tag(label, type)),
    actionLabel: r.actionLabel || defaultActionLabel,
    action: r.action || '',
    hasAiBar: !!r.aiBar,
    aiSelfPct: r.aiBar ? r.aiBar.self : 0,
    aiAssistPct: r.aiBar ? r.aiBar.assist : 0,
    aiNote: r.aiBar ? r.aiBar.note : '',
  }
}

const JOBS_RAW = [
  {
    company: '당근', role: '백엔드 신입', tier: 'yellow', isNew: true, openDefault: true,
    source: 'greenhouse · 수집 07-08', fit: 48, gapNote: '강점 1 · 기본 3 · 근거부족 1 · 미보유 2',
    deadlineTag: 'D-12', deadlineSub: '7/20 마감',
    concept: 82, impl: 41,
    skillRows: [{ name: '언어·백엔드', concept: 75, impl: 48 }, { name: 'DB·동시성', concept: 88, impl: 45 }, { name: '인프라·배포', concept: 30, impl: 15 }],
    reqRequired: [
      {
        name: 'Java/Spring 기반 API 개발', status: 'ok',
        why: 'Spring DI + JPA·MySQL 연동, 제주대 백엔드 스터디 과제 구현까지 근거는 있으나 규모는 아직 학습 수준.',
        tags: [['GitHub · besession0402', 'repo'], ['GitHub · 2026_BE_Homework(팀)', 'repo'], ['자가신고 · Java·Spring 주력', 'self']],
        action: 'besession0402를 증분 커밋으로 다시 쌓고 예외처리·테스트를 붙이기. 단일 커밋 습관만 고쳐도 증명 가능한 실력이 됨.',
        aiBar: { self: 28, assist: 72, note: 'besession0402 핵심 커밋에 "Co-Authored-By: Claude" 서명 확인 → AI 작성. 교훈: 좋은 커밋 메시지 ≠ 손작업 증거. 신뢰 신호는 커밋 서명과 면접 재현력 — 무기는 타이핑이 아니라 개념·판단.' },
      },
      {
        name: 'RDB 설계·쿼리 최적화', status: 'ok',
        why: 'MySQL 스키마 설계 + JPA N+1을 fetch join으로 해결한 근거는 구체적. 인덱스·실행계획 실측이 없어 아직 기본 수준.',
        tags: [['위키 · DB/쿼리 최적화', 'wiki'], ['자가신고 · MySQL', 'self']],
        action: 'EXPLAIN으로 인덱스 전/후 쿼리시간 실측 1건이면 강점 승격.',
      },
      {
        name: '자료구조·알고리즘', status: 'ok',
        why: '2026_BE_Homework에 문제풀이 제출 이력 확인됨. 다만 난이도 지표가 없어 아직 기본.',
        tags: [['GitHub · BE_Homework 과제 커밋', 'repo'], ['자가신고 · PS 지속', 'self']],
        action: 'solved.ac 티어 연결로 난이도를 붙이면 강점.',
      },
      {
        name: 'Git 협업', status: 'strong',
        why: '2026_BE_Homework(6~7인 팀)에서 PR 기반 협업 확인 — 62커밋·다수 Merge PR에 본인 PR 포함. 혼자 Git 아님.',
        tags: [['GitHub · 2026_BE_Homework(팀 62커밋)', 'repo'], ['PR·머지 협업', 'self']],
        action: '리뷰어로 남 코드를 리뷰한 PR 1건까지 있으면 완전한 강점 근거.',
      },
      {
        name: '테스트 코드 작성', status: 'gap',
        why: 'JUnit 개념은 알지만 습관화·커버리지가 부족. 이 카드의 유일한 필수 갭.',
        tags: [['필요 · 단위/슬라이스 테스트', 'gap']],
        action: 'jeju-market-api에 @WebMvcTest·@DataJpaTest 슬라이스 테스트부터.',
      },
    ],
    hasPreferred: true,
    reqPreferred: [
      {
        name: 'Docker·컨테이너 배포 경험', status: 'gap',
        why: '로컬 개발 위주라 컨테이너 배포 실경험이 없음. 여러 공고에 공통으로 걸리는 게이트.',
        tags: [['필요 · Docker 배포 1회', 'gap']],
        action: 'Dockerfile+compose로 배포 1회. 운영 근거까지 같이 끌어올림.',
      },
      {
        name: '대용량 트래픽 처리 경험', status: 'weak',
        why: 'k6 사용은 자가신고인데 GitHub repo에서 흔적을 못 찾음. 실제 근거가 안 보여 근거부족.',
        tags: [['자가신고 · k6', 'self'], ['미확인 · repo 흔적 없음', 'gap']],
        action: 'k6 스크립트+결과를 repo에 올리기. p99 개선 1건이면 단숨에 강점.',
      },
      {
        name: '사이드 프로젝트 운영 경험', status: 'ok',
        why: 'school-meetingRoom 배포·이전·버그픽스 등 실운영 흐름은 있음. 단 코드는 Claude 작성 확인 — 기획·운영은 본인, 구현은 아님.',
        tags: [['GitHub · school-meetingRoom', 'repo'], ['배포·유지보수 커밋', 'self']],
        action: '실사용자 수·가동 기간을 붙이면 강점.',
      },
    ],
    gapActions: [
      { order: 1, locked: true, title: '🔒 테스트 코드 습관화', desc: 'JUnit 기준 단위테스트 붙이기. 필수요건 중 유일한 갭.' },
      { order: 2, locked: false, title: 'Docker 배포 1회 경험', desc: '우대사항이지만 다른 공고에도 공통 게이트라 겸사겸사 우선.' },
    ],
    provenance: '출처: greenhouse · 수집 07-08 · 확신도 높음',
  },
  {
    company: '우아한형제들', role: '서버 개발자 신입', tier: 'yellow', isNew: true, openDefault: false,
    source: '내부 API (career.woowahan.com) · 수집 07-08', fit: 70, gapNote: '갭 2개 · 필수 5/7 충족',
    deadlineTag: 'D-18', deadlineSub: '7/26 마감',
    concept: 80, impl: 39,
    skillRows: [{ name: 'CS·알고리즘', concept: 70, impl: 40 }, { name: '언어·백엔드', concept: 68, impl: 45 }, { name: '시스템·분산', concept: 55, impl: 20 }],
    reqRequired: [
      { name: 'Java/Kotlin 기반 서버 개발', status: 'ok' }, { name: 'RDB·트랜잭션 처리', status: 'ok' },
      { name: 'CS 기본기(운영체제·네트워크)', status: 'ok' }, { name: 'TDD·테스트 문화 이해', status: 'gap' },
    ],
    hasPreferred: true,
    reqPreferred: [{ name: 'MSA 설계 경험', status: 'gap' }, { name: '알고리즘 문제풀이 역량', status: 'ok' }, { name: '기술 블로그·글쓰기', status: 'ok' }],
    gapActions: [
      { order: 1, locked: true, title: '🔒 TDD 습관 붙이기', desc: '우아한 특유 문화 요건. 테스트 먼저 짜는 연습 필요.' },
      { order: 2, locked: false, title: 'MSA 구조 학습·미니 구현', desc: '서비스 분리 경험 있으면 서면 통과율 크게 오름.' },
    ],
    provenance: '출처: 내부 API (비공개 SPA) · 수집 07-08 · 확신도 높음',
  },
  {
    company: '쿠팡', role: '백엔드 엔지니어', tier: 'yellow', isNew: false, openDefault: false,
    source: 'greenhouse · 수집 07-08', fit: 63, gapNote: '갭 1개: K8s',
    deadlineTag: 'D-25', deadlineSub: '상시채용',
    concept: 76, impl: 32,
    skillRows: [{ name: 'DB·동시성', concept: 85, impl: 42 }, { name: '시스템·분산', concept: 55, impl: 20 }, { name: '인프라·배포', concept: 30, impl: 15 }],
    reqRequired: [{ name: 'Java/Kotlin·Spring Boot', status: 'ok' }, { name: '대용량 트래픽 대응 경험', status: 'ok' }, { name: 'RDB·NoSQL 설계', status: 'ok' }],
    hasPreferred: true,
    reqPreferred: [{ name: 'Kubernetes 운영 경험', status: 'gap' }, { name: 'MSA·이벤트 기반 아키텍처', status: 'ok' }],
    gapActions: [
      { order: 1, locked: true, title: '🔒 K8s·Docker 배포 실습', desc: '유일 갭이자 게이트성 큰 항목. 작은 배포 1개면 우대사항 충족.' },
      { order: 2, locked: false, title: '분산 트레이싱 기초 학습', desc: 'MSA 환경 면접 질문 대비용, 가산점.' },
    ],
    provenance: '출처: greenhouse · 수집 07-08 · 확신도 높음',
  },
  {
    company: 'AI 백엔드 공고군', role: '(5개사 평균)', tier: 'yellow', isNew: false, openDefault: false,
    source: 'wanted API · 수집 07-08', fit: 61, gapNote: '갭 2개: K8s·서빙',
    deadlineTag: 'D-9', deadlineSub: '최빠른 마감',
    concept: 74, impl: 33,
    skillRows: [{ name: 'AI·에이전트', concept: 88, impl: 42 }, { name: '언어·백엔드', concept: 68, impl: 45 }, { name: '인프라·배포', concept: 30, impl: 15 }],
    reqRequired: [{ name: 'Python 백엔드(FastAPI 등)', status: 'ok' }, { name: 'LLM·에이전트 파이프라인 이해', status: 'ok' }, { name: 'RAG 실구현 경험', status: 'gap' }],
    hasPreferred: true,
    reqPreferred: [{ name: '모델 서빙(vLLM·TensorRT)', status: 'gap' }, { name: 'Kubernetes 배포', status: 'gap' }, { name: '프롬프트 엔지니어링', status: 'ok' }],
    gapActions: [
      { order: 1, locked: true, title: '🔒 RAG 실구현 1개 완성', desc: '개념은 있으나 필수요건인 "실구현"이 갭. 작은 프로젝트로 증명.' },
      { order: 2, locked: false, title: '모델 서빙(vLLM) 학습', desc: '고빈도 우대요건 + 비전정합 부스트로 우선순위 상위.' },
      { order: 3, locked: false, title: 'K8s 배포 경험', desc: '공고군 5개 중 4개가 요구. 게이트성 큼.' },
    ],
    provenance: '출처: wanted API · 수집 07-08 · 확신도 중간 · 경력요건 미확인',
  },
  {
    company: '네이버', role: '백엔드 개발자', tier: 'yellow', isNew: false, openDefault: false,
    source: '내부 API (recruit.navercorp.com) · 수집 07-08', fit: 58, gapNote: '갭 2개: 대용량·분산',
    deadlineTag: 'D-30', deadlineSub: '8/7 마감',
    concept: 65, impl: 27,
    skillRows: [{ name: '시스템·분산', concept: 55, impl: 20 }, { name: '언어·백엔드', concept: 68, impl: 45 }, { name: 'CS·알고리즘', concept: 70, impl: 40 }],
    reqRequired: [{ name: 'Java/Spring 기반 개발', status: 'ok' }, { name: '대용량 트래픽 처리 경험', status: 'gap' }, { name: '분산시스템 설계 이해', status: 'gap' }],
    hasPreferred: true,
    reqPreferred: [{ name: '오픈소스 기여 경험', status: 'ok' }, { name: 'CS 기본기 (네트워크·OS)', status: 'ok' }],
    gapActions: [
      { order: 1, locked: true, title: '🔒 대용량 트래픽 실험(k6)', desc: '보유 도구(k6)로 부하테스트 리포트 하나 만들면 바로 증명 가능.' },
      { order: 2, locked: false, title: '분산 실무(멱등성·Kafka) 학습', desc: '네이버류 공고 공통 요건. 다음 사이클 후보.' },
    ],
    provenance: '출처: 내부 API (비공개 SPA) · 수집 07-08 · 확신도 중간',
  },
  {
    company: '티맵모빌리티', role: 'AI Quality Engineer', tier: 'red', isGate: true,
    source: 'greenhouse · 수집 07-07', deadlineTag: '상시', deadlineSub: '채용시 마감',
    gateNote: '이 공고는 경력 1년 이상을 필수로 명시. 신입 지원 불가 게이트라 적합도를 산출하지 않고 "북극성"으로 분류함 (합격 가능성 대신 재평가 시점을 안내).',
    gateReq: '경력 1년 이상 (현재: 신입)', gapNote: '경력 1년+ 요건 미충족',
    directionNote: '개념 축은 이 직군과 가장 잘 맞음(검증·엄밀함 = 내 시그니처). 경력 게이트만 시간이 해결.',
    northStarNote: '그 사이 검증·엄밀함을 밖에서 보이는 활동(블로그·OSS)으로 대체 증명.',
    requirements: [{ name: 'LLM 평가·검증 파이프라인 설계', status: 'weak' }, { name: '적대적 테스트·레드티밍', status: 'weak' }, { name: '실무 QA 프로세스 경험', status: 'gap' }],
    provenance: '출처: greenhouse · 수집 07-07 · 확신도 높음',
  },
  {
    company: 'CJ올리브네트웍스', role: 'Forward Deployed Engineer', tier: 'red', isGate: true,
    source: '자체 채용페이지 · 수집 07-06', deadlineTag: '상시', deadlineSub: '채용시 마감',
    gateNote: '이 공고는 경력 2년 이상을 필수로 명시. 신입 지원 불가 게이트라 적합도를 산출하지 않고 "북극성"으로 분류함.',
    gateReq: '경력 2년 이상 (현재: 신입)', gapNote: '경력 2년+ 요건 미충족',
    directionNote: '우대사항이 미확인 상태라 실제 갭 크기는 더 조사 필요. 확신도 중간으로 표시.',
    northStarNote: '현장 배포형 사이드 프로젝트로 "실무 유사 경험" 축적.',
    requirements: [{ name: '고객 현장 배포·문제해결(FDE)', status: 'gap' }, { name: '풀스택 프로토타이핑', status: 'weak' }, { name: 'AI 솔루션 적용 경험', status: 'weak' }],
    provenance: '출처: 자체 채용페이지 · 수집 07-06 · 확신도 중간 · 우대사항 미확인',
  },
]

function buildJobs() {
  return JOBS_RAW.map((j) => {
    const t = tierInfo(j.tier)
    const isGate = !!j.isGate
    return {
      ...j,
      isGate,
      notGate: !isGate,
      tierColor: t.color,
      tierBg: t.bg,
      conceptGradient: !isGate ? `conic-gradient(var(--blue-bright) 0% ${j.concept}%, var(--border) ${j.concept}% 100%)` : '',
      implGradient: !isGate ? `conic-gradient(var(--blue-med) 0% ${j.impl}%, var(--border) ${j.impl}% 100%)` : '',
      conceptPct: j.concept,
      implPct: j.impl,
      reqRequired: (j.reqRequired || []).map(enrichReq),
      reqPreferred: (j.reqPreferred || []).map(enrichReq),
      requirements: (j.requirements || []).map(enrichReq),
      gapActions: (j.gapActions || []).map((g) => ({
        order: g.order,
        title: g.title,
        desc: g.desc,
        orderBg: g.locked ? 'rgba(var(--coral-rgb),0.18)' : 'var(--card-hi)',
        orderBorder: g.locked ? 'var(--coral)' : 'var(--border-soft)',
        orderColor: g.locked ? 'var(--coral)' : 'var(--text-dim)',
      })),
    }
  })
}

const LEARN_REVIEW_RAW = [
  {
    name: '자료구조·알고리즘', status: 'ok', provenance: '배운 곳: 2026_BE_Homework 과제 · 2026.05',
    chips: [{ label: '당근·네이버 요구', accent: false }, { label: '다음 복습 D+3', accent: true }],
    note: '까먹기 쉬운 것: DP·그래프 탐색 — 3문제만 다시 풀어 감 유지.',
  },
  {
    name: 'RDB · JPA (N+1)', status: 'ok', provenance: '배운 곳: besession0402 · 2026.04',
    chips: [{ label: '백엔드 공통', accent: false }, { label: '다음 복습 D+7', accent: true }],
    note: 'fetch join·@EntityGraph 개념 재확인 + 인덱스 실측 1건으로 강점 승격 노려.',
  },
  {
    name: 'Git 협업 (PR·리뷰)', status: 'ok', provenance: '배운 곳: 2026_BE_Homework 팀 PR · 2026.05',
    chips: [{ label: '상시 사용 중', accent: false }, { label: '복습 불필요', accent: false }],
    note: '유지 중. 리뷰어로 남 코드 리뷰한 이력만 더하면 강점.',
  },
]

const LEARN_NEW_RAW = [
  {
    name: '테스트 코드 (JUnit)', status: 'gap',
    chips: [{ label: '당근 필수 · 게이트성 높음', accent: false }, { label: '자료: 스프링 슬라이스 테스트', accent: true }],
    note: '→ besession0402에 @WebMvcTest·@DataJpaTest부터. 완료 시 미보유 → 기본.',
  },
  {
    name: 'Docker 배포', status: 'gap',
    chips: [{ label: '여러 공고 공통 게이트', accent: false }, { label: '자료: Dockerfile + compose', accent: true }],
    note: '→ 배포 1회면 운영 근거까지 같이 상승.',
  },
  {
    name: '대용량 · k6 실측', status: 'weak',
    chips: [{ label: '성능 · 당근/네이버', accent: false }, { label: '자료: k6 부하 → p99', accent: true }],
    note: '→ 부하 → 병목 프로파일 → 개선 수치 1건 = 단숨에 강점.',
  },
  {
    name: 'LLM 레드티밍 · 평가 파이프라인', visionLabel: '비전: AI 안전', isVision: true,
    chips: [{ label: '에임인텔리전스 정합', accent: false }, { label: '자료: adversarial eval · garak', accent: true }],
    note: '→ 작은 평가 스크립트를 AI 최소로 직접 구현 → 재현 가능 증거. 개념 강점을 구현 증거로 바꾸는 핵심 한 수.',
  },
]

function buildLearnReview() {
  return LEARN_REVIEW_RAW.map((l) => {
    const s = statusInfo(l.status)
    return {
      name: l.name, label: s.label, color: s.color, dot: s.dot, provenance: l.provenance,
      chips: l.chips.map((c) => ({
        label: c.label,
        color: c.accent ? 'var(--blue-bright)' : 'var(--text-dim)',
        border: c.accent ? 'rgba(var(--blue-bright-rgb),0.35)' : 'var(--border)',
      })),
      note: l.note,
    }
  })
}

function buildLearnNew() {
  return LEARN_NEW_RAW.map((l) => {
    const hasStatus = !l.isVision
    const s = hasStatus ? statusInfo(l.status) : null
    return {
      name: l.name,
      hasStatus,
      isVision: !!l.isVision,
      color: hasStatus ? s.color : 'var(--blue-bright)',
      dot: hasStatus ? s.dot : 'var(--blue-bright)',
      label: hasStatus ? s.label : l.visionLabel,
      chips: l.chips.map((c) => ({
        label: c.label,
        color: c.accent ? 'var(--blue-med)' : 'var(--text-dim)',
        border: c.accent ? 'rgba(var(--blue-med-rgb),0.35)' : 'var(--border)',
      })),
      note: l.note,
    }
  })
}

export const jobs = buildJobs()
export const learnReview = buildLearnReview()
export const learnNew = buildLearnNew()
