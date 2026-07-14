// ─────────────────────────────────────────────────────────────
//  MOCK 데이터 — 나중에 이 파일만 API 응답으로 교체하면 됨.
//  화면 컴포넌트는 이 구조만 알면 되고, 출처는 몰라도 된다(관심사 분리).
// ─────────────────────────────────────────────────────────────

// 4등급 정의 — "근거 없으면 충족이라고 안 쓴다"는 원칙의 코드화
export const GRADES = {
  strong: { label: '강점', cls: 'strong' }, // 직접 증거로 증명됨
  ok: { label: '기본', cls: 'ok' }, //     경험은 있으나 심화·무의존 증명 부족
  weak: { label: '근거부족', cls: 'weak' }, // 관련은 있으나 증거 부재 → 충족 안 씀
  gap: { label: '미보유', cls: 'gap' }, //   해당 없음
}

// 지원자(나) — AI 관여 실측은 GitHub Co-Authored 서명 스캔 결과
export const me = {
  name: '이승현',
  school: '제주대 컴퓨터공학',
  track: '백엔드(Java/Spring) · AI 안전 관심',
  summary: '검증·적대적 사고와 알고리즘이 개념 강점. 구현은 아직 AI 의존적.',
  ai: {
    direct: 28,
    ai: 72,
    basis: 'GitHub 15개 repo의 Co-Authored-By: Claude 서명 스캔 (실측)',
  },
}

// 회사별 적합도 채점.
// req: { label, grade, concept(개념축), impl(구현축 O/△/X), why(근거), ai(AI관여 메모) }
export const companies = [
  {
    id: 'sionic',
    name: '사이오닉에이아이',
    role: '[인턴] Backend Developer (Kotlin + Spring)',
    tag: 'AI 제품 · 인턴',
    fit: 58,
    tier: 'ok',
    headline: '스택 방향이 맞고 인턴이라 문턱이 낮다 — 단 Kotlin 공백 + 구현 증거의 AI 의존이 관문.',
    reqs: [
      {
        label: 'Spring 기반 백엔드',
        grade: 'ok',
        concept: true,
        impl: '△',
        why: '좌석 예약 캡스톤에서 Spring 백엔드 + 동시성 제어(낙관적 락)·트랜잭션·k6 부하테스트를 구현. 개념은 설명 가능.',
        ai: 'AI 작성 비중 높음 — 무의존 재현은 아직 미검증.',
      },
      {
        label: 'Kotlin',
        grade: 'weak',
        concept: false,
        impl: 'X',
        why: 'Java 경험은 있으나 Kotlin 실사용 저장소가 없음. Spring 공유로 학습은 빠르겠지만 증거가 없어 충족으로 쓰지 않음.',
        ai: null,
      },
      {
        label: 'REST API · DB 스키마 설계',
        grade: 'ok',
        concept: true,
        impl: '△',
        why: '미션·캡스톤에서 CRUD·스키마 설계 경험. 인덱싱·RLS 등 심화는 미보유.',
        ai: '구현 상당수 AI 보조.',
      },
      {
        label: 'CS 기초 · 알고리즘',
        grade: 'strong',
        concept: true,
        impl: 'O',
        why: '병원 수술 스케줄링을 RCPSP로 환원해 CP-SAT/GA/SA로 비교, "붕괴"가 느린 디코더 인공물임을 잡아 45× 개선. 직접 사고의 증거.',
        ai: '문제 정의·디버깅이 본인 판단 — 개념축 강점.',
      },
      {
        label: 'AI 제품 이해',
        grade: 'strong',
        concept: true,
        impl: 'O',
        why: '커리어 코파일럿·SCPC 챌린지에서 LLM/SLM 하네스를 직접 설계. "AI로 뭘 만드는지" 감각이 있음.',
        ai: '하네스 설계 관점은 본인 것.',
      },
      {
        label: '팀 협업 (PR 리뷰)',
        grade: 'weak',
        concept: false,
        impl: 'X',
        why: 'GitHub 15개 repo·이슈·칸반은 운영했으나 대부분 개인 작업. 팀 코드리뷰 경험 근거가 없음.',
        ai: null,
      },
    ],
  },
  {
    id: 'cornerstone',
    name: '코너스톤파트너스디지털',
    role: '소프트웨어 개발자 (주니어) — AI Agent · 데이터',
    tag: 'AI Agent · 주니어',
    fit: 62,
    tier: 'ok',
    headline: '"AI Agent"가 네 커리어 코파일럿과 정확히 겹친다 — 가장 자연스러운 매치.',
    reqs: [
      {
        label: 'AI Agent / 하네스 이해',
        grade: 'strong',
        concept: true,
        impl: 'O',
        why: '커리어 코파일럿 자체가 agent. 서브에이전트 5명 병렬 분해 + 감사관 구조, 출력 스키마로 완결성 강제 등 설계 경험.',
        ai: '설계·오케스트레이션 판단은 본인 것.',
      },
      {
        label: '백엔드 · 데이터 처리',
        grade: 'ok',
        concept: true,
        impl: '△',
        why: '캡스톤·미션의 백엔드 + SCPC의 규칙엔진(700개 채점). 대규모 데이터 파이프라인 심화는 미보유.',
        ai: '구현 AI 보조 비중 높음.',
      },
      {
        label: '데이터 엔지니어링 (ETL/파이프라인)',
        grade: 'weak',
        concept: false,
        impl: 'X',
        why: '정형 스크립트 수준은 있으나 프로덕션 ETL·워크플로 오케스트레이션 증거가 없음.',
        ai: null,
      },
      {
        label: 'CS 기초 · 문제해결',
        grade: 'strong',
        concept: true,
        impl: 'O',
        why: 'SCPC AI챌린지에서 로컬 0.95→서버 0.50 과적합을 "문자매칭→의미분류" 전환 한 줄로 서버 +0.37 복구. 일반화 감각.',
        ai: '진단·전환 판단이 본인 것.',
      },
      {
        label: 'Python',
        grade: 'ok',
        concept: true,
        impl: '△',
        why: 'SCPC·퀀트 백테스트에서 Python 사용. 프레임워크 심화는 얕음.',
        ai: '구현 AI 보조.',
      },
    ],
  },
  {
    id: 'aim',
    name: '에임인텔리전스',
    role: 'AI 레드티밍 · 안전성 평가 (관심 회사)',
    tag: 'AI 안전 · 비전 정합',
    fit: 44,
    tier: 'weak',
    headline: '비전 정합은 최상 — 하지만 "논문 재현을 직접 구현"에서 갈린다. 지금 채우면 딱 맞는 갭.',
    reqs: [
      {
        label: '적대적 · 검증 사고',
        grade: 'strong',
        concept: true,
        impl: 'O',
        why: '위키 전반이 "검증의 함정" — 백테스트를 랜덤·OOS·생존편향으로 착시 폭로, 적대적 검증으로 리셀 후보 2/3의 함정 적발. 이 회사 핵심 역량과 개념 정합 최상.',
        ai: '검증 설계·판단은 전적으로 본인 것 — 최대 강점.',
      },
      {
        label: '논문 재현 · 평가 파이프라인 직접 구현',
        grade: 'gap',
        concept: true,
        impl: 'X',
        why: 'ICLR/ICML 재현 경험 없음. 구현이 AI 의존적이라 "무의존 재현"을 증명하지 못함 — 이 회사가 정확히 보는 지점.',
        ai: '★ 바로 이 갭이 AI 관여 실측(72%)이 드러낸 핵심 약점.',
      },
      {
        label: 'LLM 레드티밍 / jailbreak 평가',
        grade: 'weak',
        concept: true,
        impl: 'X',
        why: '하네스 설계 경험은 있으나 공격 시나리오·탈옥 평가를 직접 돌린 증거는 없음.',
        ai: null,
      },
      {
        label: 'Python · ML 프레임워크',
        grade: 'ok',
        concept: true,
        impl: '△',
        why: 'SCPC·퀀트에서 Python. PyTorch 등 ML 프레임워크 심화는 미보유.',
        ai: '구현 AI 보조.',
      },
      {
        label: '커리어 비전 정합',
        grade: 'strong',
        concept: true,
        impl: 'O',
        why: 'AI 안전이 커리어 비전 도착점(만든다→검증한다→책임진다, human-in-the-loop). 회사 미션과 방향이 한 줄로 이어짐.',
        ai: '방향성은 본인 정립.',
      },
    ],
  },
]
