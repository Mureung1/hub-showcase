// 프로토타입의 백엔드 콘텐츠를 화면 흐름 확인용 mock 데이터로 구조화한 것.
// 실제 수집 데이터가 아니며, 나중에 서버 API 응답으로 교체할 자리다.

export const JOBS = [
  '백엔드 개발자',
  '프론트엔드 개발자',
  'AI 엔지니어',
  '데이터 엔지니어',
  '풀스택 개발자',
  'DevOps 엔지니어',
  '모바일 개발자',
  '정보보안',
  '게임 개발자',
]

// MVP 데이터가 있는 직무 (나머지는 순차 확보 예정)
export const SUPPORTED_JOB = '백엔드 개발자'

export const PREVIEW = [
  { title: '구현 범위 분석', desc: '기술을 데이터 흐름·예외 처리·성능까지 어디까지 다뤄야 하는지 확인합니다.' },
  { title: '인재상 역산', desc: 'baseline과 비교해 이 회사·기업군이 유독 강조하는 지점을 밝힙니다.' },
  { title: '합격 조건', desc: '자소서·포트폴리오·면접에 무엇을 담을지 체크리스트로 정리합니다.' },
  { title: '준비 로드맵', desc: '미체크 항목을 채우는 학습·프로젝트를 순서대로 제안합니다.' },
]

export const STATS = {
  postCount: 30,
  metrics: [
    { num: '30', unit: '건', caption: '분석한 채용공고' },
    { num: '55', unit: '%', caption: '신입 또는 1년 이하 지원 가능' },
    { num: '68', unit: '%', caption: 'API·DB 설계 경험을 조건으로 언급' },
    { num: '4.2', unit: '개', caption: '공고당 평균 필수 기술 조합' },
    { num: '47', unit: '%', caption: '클라우드·컨테이너 언급' },
  ],
  combos: [
    {
      count: '13 / 30건',
      title: 'Java + Spring Boot + JPA + MySQL',
      desc: '한 도메인의 CRUD REST API를 DB와 연결하고, 트랜잭션과 연관관계까지 다루는 조합입니다.',
      level: '기대 수준: 한 도메인을 배포 가능한 API로 완성',
      primary: true,
      chips: [],
    },
    {
      count: '9 / 30건',
      title: 'REST API + 예외·상태 처리',
      desc: '성공 응답만이 아니라 요청 검증, 에러 응답, 실패·재시도 흐름까지 설계하는 조합입니다.',
      level: '기대 수준: 실패 흐름까지 구현',
      primary: false,
      chips: [],
    },
    {
      count: '7 / 30건',
      title: 'Docker + AWS 배포',
      desc: '컨테이너로 빌드하고 클라우드에 배포하는 파이프라인을 다루는 우대 조합입니다.',
      level: '기대 수준: 배포 파이프라인 구성(우대)',
      primary: false,
      chips: [{ label: 'Docker', logo: 'docker' }],
    },
  ],
  skills: [
    { rank: 1, name: 'Java', logo: 'java', count: 24, pct: 80, cls: 'java' },
    { rank: 2, name: 'Spring Boot', logo: 'spring', count: 22, pct: 73, cls: 'spring' },
    { rank: 3, name: 'MySQL·RDB', logo: 'mysql', count: 20, pct: 67, cls: 'mysql' },
    { rank: 4, name: 'JPA·ORM', logo: 'jpa', count: 16, pct: 53, cls: 'jpa' },
    { rank: 5, name: 'REST API', logo: 'api', count: 15, pct: 50, cls: 'api' },
    { rank: 6, name: 'Git 협업', logo: 'git', count: 14, pct: 47, cls: 'git' },
  ],
  trend: [
    { label: '백엔드 공고 수', delta: '▲ +12%', desc: '전체 채용시장 대비 백엔드 직군 비중이 소폭 늘었습니다.' },
    { label: 'Docker 등장 비율', delta: '26% → 37%', desc: '컨테이너 기반 빌드·배포를 우대하는 공고가 늘었습니다.' },
    { label: 'Redis 등장 비율', delta: '18% → 27%', desc: '캐시·세션 처리 등 성능 관련 요구가 증가했습니다.' },
    { label: 'Kafka·메시지큐', delta: '12% → 20%', desc: '비동기·대용량 처리 경험을 찾는 공고가 늘고 있습니다.' },
  ],
  conditions: [
    { title: '학력 조건', stats: [['60%', '학력 무관'], ['28%', '전공 우대'], ['12%', '대졸 이상 명시']] },
    { title: '경력 조건', stats: [['48%', '신입 지원 가능'], ['12%', '1년 이하 가능'], ['40%', '2년 이상 선호']] },
    { title: '배포·인프라 언급', stats: [['37%', 'Docker 컨테이너'], ['33%', 'AWS 클라우드'], ['23%', 'CI/CD 자동화']] },
  ],
  clusters: [
    { tag: '빅테크·플랫폼', title: '대용량·성능·캐시', desc: '트래픽·동시성 처리와 캐시·성능 최적화를 언급하는 비율이 전체 평균보다 높습니다.', chips: [{ label: 'Redis', logo: 'redis' }, { label: '대용량' }, { label: '성능' }] },
    { tag: '핀테크·금융', title: '트랜잭션·보안', desc: '결제·정산의 정합성과 인증·보안을 강조하는 문장 비율이 두드러집니다.', chips: [{ label: '트랜잭션', logo: 'mysql' }, { label: '정합성' }, { label: '보안' }] },
    { tag: 'B2B SaaS', title: 'API 설계·도메인', desc: 'API 설계와 도메인 모델링, 안정적인 유지보수를 언급하는 비율이 높습니다.', chips: [{ label: 'API 설계', logo: 'spring' }, { label: '도메인', logo: 'jpa' }, { label: '안정성' }] },
  ],
}

export const BASELINE = [
  { title: 'CRUD REST API 완성', desc: '한 도메인의 생성·조회·수정·삭제를 DB와 연결해 배포 가능한 API로 완성합니다.' },
  { title: '예외·검증·에러 응답', desc: '요청 검증과 실패 응답을 설계합니다. 성공 응답만 다루는 수준을 넘어섭니다.' },
  { title: 'RDB 스키마·기본 쿼리', desc: '테이블 설계와 조인·인덱스의 기본을 이해하고 적용합니다.' },
  { title: 'Git 브랜치·PR 협업', desc: '변경 단위를 나눠 브랜치·PR로 협업한 기록을 남깁니다.' },
]

export const CLUSTER_NAME = '핀테크·금융'

export const DEVIATIONS = [
  { topic: '트랜잭션', baseline: '트랜잭션 개념 이해', deviation: '동시성·롤백·정합성 보장까지', evidence: '근거: "결제·정산의 정확성" 반복 문장 · 회사 기술 블로그', confidence: 'high', ratio: '같은 직군 27%' },
  { topic: '보안', baseline: '공통 항목에 없음', deviation: '신규 · 인증·인가·민감정보 암호화', evidence: '근거: 회사 보안 정책·기술 블로그 (공고 문장은 간접적)', confidence: 'mid', ratio: '같은 직군 22%' },
  { topic: '대용량 처리', baseline: '성능 고려', deviation: '대량 트래픽·데이터 처리 경험', evidence: '근거: "일 수백만 건 거래" 문장', confidence: 'mid', ratio: '같은 직군 18%' },
]

export const POSTING = {
  company: 'A 핀테크사 백엔드 공고',
  quote: '"대용량 트랜잭션을 안전하게 처리한 경험", "장애 상황에서도 데이터 정합성 유지"',
  interpret: 'baseline의 \'트랜잭션 이해\'를 넘어 동시성·정합성 심화를 요구합니다. 롤백·재처리 설계 경험을 보여줄 수 있으면 이 공고의 핵심 편차를 정면으로 채웁니다.',
  confidence: 'high',
  note: 'CRUD·Git 같은 baseline 공통 항목은 편차가 없어 접어 두었습니다. 이 공고에서 실제로 갈리는 지점은 트랜잭션 정합성입니다.',
}

export const CONFIDENCE_LABEL = { high: '신뢰도 높음', mid: '신뢰도 중간', low: '신뢰도 낮음' }

export const CHECKLIST = [
  { item: 'CRUD REST API 프로젝트', evidence: '배포 URL + README + GitHub', channel: '포트폴리오', has: false },
  { item: '예외·에러 응답 설계', evidence: '실패 케이스 처리 코드·문서', channel: '포트폴리오 · 면접', has: false },
  { item: '트랜잭션·동시성 이해', evidence: '개념 설명 + 적용 사례', channel: '면접', has: false },
  { item: '협업 중 문제 해결 서사', evidence: '문제 → 해결 과정 서술', channel: '자소서', has: true },
  { item: '성능 개선 경험 (우대)', evidence: '개선 전후 지표', channel: '포트폴리오 · 면접', has: false },
]

export const CHANNELS = [
  { id: 'essay', kicker: '자소서 소재', items: ['협업 중 겪은 문제와 해결 과정', '그 과정에서의 판단·성장 서사'] },
  { id: 'portfolio', kicker: '포트폴리오 강조점', items: ['배포 URL · README · GitHub 커밋 기록', '기업군별 강조 순서 — 핀테크: 정합성·보안 먼저 / 빅테크: 성능·캐시 먼저'] },
  { id: 'interview', kicker: '예상 면접 질문', items: ['"트랜잭션 격리 수준을 왜 그렇게 골랐나?"', '"JPA N+1 문제를 어떻게 해결했나?"', '"인덱스 설계 기준은 무엇이었나?"'] },
]

export const ROADMAP = [
  {
    phase: 'STEP 01 · 3주', title: '기본 CRUD REST API를 DB와 연결해 배포하기', priority: '우선순위: 매우 높음',
    desc: '한 도메인(예: 주문·게시판)을 정하고 Spring Boot + JPA + MySQL로 생성·조회·수정·삭제 API를 만들어 배포까지 완성하세요.',
    fills: 'CRUD REST API 프로젝트',
    chips: [{ label: 'Spring Boot CRUD', logo: 'spring' }, { label: 'JPA 연관관계', logo: 'jpa' }, { label: 'MySQL 스키마', logo: 'mysql' }],
    reasonLabel: '왜 먼저 해야 하나요?',
    reason: 'Java·Spring·JPA·MySQL 조합이 13/30으로 가장 많이 함께 요구됩니다. 한 도메인을 끝까지 완성하면 baseline 공통 기대치를 한 번에 채웁니다.',
  },
  {
    phase: 'STEP 02 · 3주', title: '예외·검증과 트랜잭션 처리까지 다루기', priority: '우선순위: 높음',
    desc: '요청 검증, 에러 응답, 트랜잭션과 롤백을 추가하고 실패 케이스를 문서로 남기세요.',
    fills: '예외·에러 응답 설계, 트랜잭션·동시성 이해',
    chips: [{ label: '에러 응답 설계', logo: 'api' }, { label: '트랜잭션·롤백' }, { label: '실패 케이스 문서화' }],
    reasonLabel: '왜 두 번째인가요?',
    reason: 'REST API + 예외·상태 처리 조합이 9/30에서 반복되고, 핀테크·금융 기업군은 트랜잭션 정합성을 특히 강조합니다(역산 편차 27%).',
  },
  {
    phase: 'STEP 03 · 2주', title: '우대 하나를 골라 성능 개선 경험 남기기', priority: '우선순위: 중간',
    desc: 'Redis 캐시 / 인덱스·쿼리 튜닝 / 테스트·CI 중 하나를 골라 개선 전후 지표를 남기세요.',
    fills: '성능 개선 경험(우대)',
    chips: [{ label: 'Redis 캐시', logo: 'redis' }, { label: '인덱스·쿼리 튜닝', logo: 'mysql' }, { label: '테스트 · CI' }],
    reasonLabel: '왜 우대사항을 골라야 하나요?',
    reason: 'Docker 37%·Redis 27% 등 성능·인프라 요구가 이전 1년보다 늘고 있습니다. 개선 전후 지표는 면접에서 설득력 있는 근거가 됩니다.',
  },
  {
    phase: 'STEP 04 · 1주', title: '목표 기업군에 맞춰 소개 순서 구성하기', priority: '우선순위: 높음',
    desc: '같은 프로젝트라도 핀테크에는 정합성·보안을, 빅테크에는 성능·대용량을 앞에 둡니다. 공고에 맞춰 README 첫 화면과 자소서 순서를 바꾸세요.',
    fills: '지원 공고 맞춤 소개',
    chips: [{ label: '핀테크: 정합성·보안 먼저' }, { label: '빅테크: 성능·대용량 먼저' }, { label: 'README·자소서 순서 조정' }],
    reasonLabel: '왜 마지막 단계인가요?',
    reason: '같은 백엔드라도 기업군마다 강조점이 다릅니다. 이미 만든 프로젝트를 공고에 맞게 소개하면 지원 메시지가 더 선명해집니다.',
  },
]
