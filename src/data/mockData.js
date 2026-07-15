// ─────────────────────────────────────────────────────────────
//  MOCK 데이터 — 나중에 이 파일만 API 응답으로 교체하면 됨.
//  구조는 원본 프로토타입 v2 를 그대로 따른다 (개념·구현 2축 + 정직 4등급).
//  등급: st-strong(강점) · st-ok(기본) · st-weak(근거부족) · st-gap(미보유)
// ─────────────────────────────────────────────────────────────

export const companies = [
  {
    id: 'sionic',
    tier: 'yellow',
    company: '사이오닉에이아이',
    role: '[인턴] Backend Developer (Kotlin+Spring)',
    isNew: true,
    source: 'wanted · 수집 07-15',
    fit: 58,
    gapNote: '강점 2 · 기본 2 · 근거부족 1 · 미보유 1',
    deadlineTag: '채용중',
    deadlineSub: 'wanted 공고',
    concept: 78,
    impl: 40,
    skills: [
      { name: '언어·백엔드', concept: 72, impl: 45 },
      { name: 'DB·설계', concept: 70, impl: 38 },
      { name: 'AI·하네스', concept: 80, impl: 42 },
    ],
    gapActions: [
      { order: 1, locked: true, title: '🔒 Kotlin 소스 1개', desc: 'Spring 미니앱을 Kotlin으로 이전. 이 카드 유일한 필수 약점.' },
      { order: 2, locked: false, title: '리뷰어 PR 1건', desc: '남 코드를 리뷰한 PR로 팀 협업 근거 확보.' },
    ],
    provenance: ['출처: wanted', '수집 07-15'],
    confidence: 'mid',
    confidenceLabel: '확신도 중간 (인턴 공고 기준)',
    reqGroups: [
      {
        label: '필수',
        items: [
          {
            name: 'Spring 기반 백엔드',
            status: 'st-ok',
            rich: {
              proj: { name: 'besession0402', meta: 'Java · Spring · JPA · MySQL · 2026.04 (own) · 제주대 백엔드 스터디 2026_BE_Homework 병행' },
              built: [
                '좌석 예약 캡스톤 — Spring 백엔드 + 동시성 제어(낙관적 락)·트랜잭션',
                '제주대 백엔드 스터디 주차 과제 (2026_BE_Homework)',
                'REST·CRUD 기본기 — 규모는 아직 학습 수준',
              ],
              metrics: ['<b>452</b>줄 · <b>11</b>파일', '<b>1</b>커밋 ⚠', '팀 repo <b>62</b>커밋 참여'],
              ai: {
                assist: 72,
                self: 28,
                assistLabel: 'AI 작성 (확인·유력)',
                selfLabel: '직접 근거 약함',
                basis: 'school-meetingRoom 핵심 커밋에 <b>"Co-Authored-By: Claude Opus 4.7/4.8"</b> 서명 → AI 작성 확인. besession0402는 1커밋이라 판별 불가.',
                note: '<b>좋은 커밋 메시지 ≠ 손작업 증거</b>(Claude가 대신 써줌). 신뢰 신호는 Co-Authored 트레일러 + 면접 재현 가능성. → 무기는 타이핑이 아니라 개념·판단.',
              },
              links: [
                { cls: 'ev-repo', text: 'GitHub · besession0402' },
                { cls: 'ev-repo', text: 'GitHub · 2026_BE_Homework (팀)' },
                { cls: 'ev-self', text: '자가신고 · Java·Spring 주력' },
              ],
              action: { label: '→ 강점으로', text: 'besession0402를 증분 커밋으로 다시 쌓고 예외처리·테스트를 붙이기. 단일 커밋 습관만 고쳐도 증명 가능한 실력.' },
              unconfirmed: 'GitHub 15개 repo 실측 기반 · 규모는 besession0402(소형 학습 프로젝트) 기준',
            },
          },
          {
            name: 'Kotlin',
            status: 'st-weak',
            why: 'Java 경험은 있으나 <b>Kotlin 실사용 저장소가 없음</b>. Spring 공유로 학습은 빠르겠지만 증거가 없어 충족으로 쓰지 않음.',
            tags: [{ cls: 'ev-self', text: '자가신고 · Java' }, { cls: 'ev-gap', text: '미확인 · Kotlin repo 없음' }],
            action: { label: '→ 검증', text: 'Spring 미니 프로젝트 1개를 Kotlin으로 옮기면 단숨에 기본.' },
          },
          {
            name: 'REST API · DB 스키마 설계',
            status: 'st-ok',
            why: '미션·캡스톤에서 CRUD·스키마 설계 경험. 인덱스·실행계획 심화는 아직.',
            tags: [{ cls: 'ev-repo', text: 'GitHub · besession0402' }, { cls: 'ev-self', text: '자가신고 · MySQL' }],
            action: { label: '→ 강점으로', text: 'EXPLAIN으로 인덱스 전/후 쿼리시간 실측 1건이면 최적화 증명.' },
          },
        ],
      },
      {
        label: '우대',
        items: [
          {
            name: 'CS 기초 · 알고리즘',
            status: 'st-strong',
            why: '<b>실측 강점</b> — 병원 수술 스케줄링을 RCPSP로 환원해 CP-SAT/GA/SA 비교, "붕괴"가 느린 디코더 인공물임을 잡아 45× 개선. 직접 사고의 증거.',
            tags: [{ cls: 'ev-wiki', text: '위키 · 스케줄링 최적화' }, { cls: 'ev-repo', text: 'GitHub · SCPC 규칙엔진' }],
            action: { label: '→ 유지', text: 'solved.ac 티어 연결로 난이도 지표만 붙이면 완결.' },
          },
          {
            name: 'AI 제품 이해',
            status: 'st-strong',
            why: '<b>실측 강점</b> — 커리어 코파일럿·SCPC에서 LLM/SLM 하네스를 직접 설계. AI로 뭘 만드는지 감각.',
            tags: [{ cls: 'ev-wiki', text: '위키 · 하네스 엔지니어링' }],
            action: { label: '→ 유지', text: '하네스 1개를 공개 데모로 배포하면 면접 최강 카드.' },
          },
          {
            name: '팀 협업 (PR 리뷰)',
            status: 'st-weak',
            why: 'GitHub 15개 repo·이슈·칸반은 운영했으나 대부분 개인 작업. <b>남 코드를 리뷰한 PR</b> 근거가 없음.',
            tags: [{ cls: 'ev-repo', text: 'GitHub · BE_Homework 팀 62커밋' }, { cls: 'ev-gap', text: '미확인 · 리뷰어 경험' }],
            action: { label: '→ 검증', text: '리뷰어로 남 코드를 리뷰한 PR 1건이면 기본→강점.' },
          },
        ],
      },
    ],
  },

  {
    id: 'cornerstone',
    tier: 'green',
    company: '코너스톤파트너스디지털',
    role: '소프트웨어 개발자 (주니어) — AI Agent · 데이터',
    isNew: true,
    source: 'wanted · 수집 07-15',
    fit: 62,
    gapNote: '강점 2 · 기본 2 · 미보유 1',
    deadlineTag: '채용중',
    deadlineSub: '주니어',
    concept: 80,
    impl: 42,
    skills: [
      { name: 'AI·하네스', concept: 82, impl: 45 },
      { name: '백엔드', concept: 68, impl: 40 },
      { name: '데이터', concept: 55, impl: 25 },
    ],
    gapActions: [
      { order: 1, locked: true, title: '🔒 ETL 미니 파이프라인', desc: '유일 우대 갭. 간이 배치/워크플로 1개.' },
      { order: 2, locked: false, title: 'Python 프레임워크 심화', desc: 'FastAPI/pandas 실사용 1건.' },
    ],
    provenance: ['출처: wanted', '수집 07-15'],
    confidence: 'mid',
    confidenceLabel: '확신도 중간',
    reqGroups: [
      {
        label: '필수',
        items: [
          {
            name: 'AI Agent / 하네스 이해',
            status: 'st-strong',
            why: '<b>실측 강점</b> — 커리어 코파일럿 자체가 agent. 서브에이전트 병렬 분해 + 감사관 구조, 출력 스키마로 완결성 강제 설계 경험. 이 공고와 가장 자연스러운 매치.',
            tags: [{ cls: 'ev-wiki', text: '위키 · 멀티에이전트' }, { cls: 'ev-repo', text: 'GitHub · 커리어 코파일럿' }],
            action: { label: '→ 유지', text: 'agent 파이프라인을 README+데모로 공개하면 최강 카드.' },
          },
          {
            name: '백엔드 · 데이터 처리',
            status: 'st-ok',
            why: '캡스톤·미션 백엔드 + SCPC 규칙엔진(700개 채점). 대규모 파이프라인 심화는 아직.',
            tags: [{ cls: 'ev-repo', text: 'GitHub · SCPC' }, { cls: 'ev-self', text: '자가신고 · Spring' }],
            action: { label: '→ 강점으로', text: '배치·큐 붙인 데이터 처리 1건이면 강점.' },
          },
          {
            name: 'CS 기초 · 문제해결',
            status: 'st-strong',
            why: '<b>실측 강점</b> — SCPC에서 로컬 0.95→서버 0.50 과적합을 "문자매칭→의미분류" 전환으로 서버 +0.37 복구. 일반화 감각.',
            tags: [{ cls: 'ev-wiki', text: '위키 · 일반화·검증' }],
            action: { label: '→ 유지', text: '유지. 알고리즘 티어만 얹으면 완결.' },
          },
        ],
      },
      {
        label: '우대',
        items: [
          {
            name: '데이터 엔지니어링 (ETL/파이프라인)',
            status: 'st-gap',
            why: '<b>갭</b> — 정형 스크립트 수준은 있으나 프로덕션 ETL·워크플로 오케스트레이션 근거가 없음.',
            tags: [{ cls: 'ev-gap', text: '필요 · ETL 파이프라인' }],
            action: { label: '→ 채우기', gap: true, text: 'Airflow/간이 배치 파이프라인 1개면 우대 충족.' },
          },
          {
            name: 'Python',
            status: 'st-ok',
            why: 'SCPC·퀀트 백테스트에서 Python. 프레임워크 심화는 얕음.',
            tags: [{ cls: 'ev-repo', text: 'GitHub · 퀀트 백테스트' }],
            action: { label: '→ 강점으로', text: 'FastAPI/pandas 실서비스 1건.' },
          },
        ],
      },
    ],
  },

  {
    id: 'aim',
    tier: 'red',
    company: '에임인텔리전스',
    role: 'AI 레드티밍 · 안전성 평가 (관심 회사)',
    isNew: false,
    source: '관심회사 · 조사 07-15',
    fit: 44,
    gapNote: '강점 2 · 근거부족 1 · 미보유 1',
    deadlineTag: '관심',
    deadlineSub: '비전 정합',
    concept: 76,
    impl: 28,
    skills: [
      { name: '검증·적대', concept: 90, impl: 55 },
      { name: 'ML·재현', concept: 45, impl: 20 },
      { name: 'LLM·레드팀', concept: 60, impl: 22 },
    ],
    gapActions: [
      { order: 1, locked: true, title: '🔒 논문 1편 무의존 재현', desc: 'AI 최소로 재현·공개. 이 회사의 결정적 관문.' },
      { order: 2, locked: false, title: 'jailbreak 평가 미니 실습', desc: '레드티밍 실측 근거 확보.' },
    ],
    provenance: ['출처: 관심회사 조사', '07-15'],
    confidence: 'mid',
    confidenceLabel: '확신도 중간',
    reqGroups: [
      {
        label: '필수',
        items: [
          {
            name: '적대적 · 검증 사고',
            status: 'st-strong',
            why: '<b>실측 강점 (최상)</b> — 위키 전반이 "검증의 함정": 백테스트를 랜덤·OOS·생존편향으로 착시 폭로, 적대적 검증으로 리셀 후보 2/3 함정 적발. 이 회사 핵심 역량과 개념 정합 최상.',
            tags: [{ cls: 'ev-wiki', text: '위키 · 검증의 함정' }, { cls: 'ev-wiki', text: '위키 · 백테스트 검증' }],
            action: { label: '→ 유지', text: '이 사고과정을 글로 공개하면 지원서 최강 서사.' },
          },
          {
            name: '논문 재현 · 평가 파이프라인 직접 구현',
            status: 'st-gap',
            why: '<b>갭</b> — ICLR/ICML 재현 경험 없음. <b>구현이 AI 의존적(직접 28% / AI 72%, Co-Authored 실측)</b>이라 "무의존 재현"을 증명 못 함 — 이 회사가 정확히 보는 지점.',
            tags: [{ cls: 'ev-gap', text: '필요 · 논문 1편 무의존 재현' }],
            action: { label: '→ 채우기', gap: true, text: '작은 평가 논문 1편을 AI 최소로 재현·공개. 개념 강점을 구현 증거로 전환.' },
          },
          {
            name: 'LLM 레드티밍 / jailbreak 평가',
            status: 'st-weak',
            why: '하네스 설계 경험은 있으나 <b>공격 시나리오·탈옥 평가를 직접 돌린 근거가 없음.</b>',
            tags: [{ cls: 'ev-self', text: '자가신고 · 하네스' }, { cls: 'ev-gap', text: '미확인 · 레드팀 실습' }],
            action: { label: '→ 검증', text: '오픈 LLM에 jailbreak 평가 미니 실습 1건.' },
          },
        ],
      },
      {
        label: '우대',
        items: [
          {
            name: 'Python · ML 프레임워크',
            status: 'st-ok',
            why: 'SCPC·퀀트에서 Python. PyTorch 등 ML 프레임워크 심화는 미보유.',
            tags: [{ cls: 'ev-repo', text: 'GitHub · SCPC' }],
            action: { label: '→ 강점으로', text: 'PyTorch로 간단 평가 스크립트 1건.' },
          },
          {
            name: '커리어 비전 정합',
            status: 'st-strong',
            why: '<b>강점</b> — AI 안전이 커리어 비전 도착점(만든다→검증한다→책임진다, human-in-the-loop). 회사 미션과 방향이 한 줄로 이어짐.',
            tags: [{ cls: 'ev-wiki', text: '위키 · 커리어 비전' }],
            action: { label: '→ 유지', text: '방향 정합은 이미 최상. 구현 갭만 메우면 됨.' },
          },
        ],
      },
    ],
  },
]

// 등급 라벨 (배지 텍스트)
export const STATUS_LABEL = {
  'st-strong': '강점',
  'st-ok': '기본',
  'st-weak': '근거부족',
  'st-gap': '미보유',
}
