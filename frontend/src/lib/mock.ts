import type {
  Credential,
  CredentialInput,
  CredentialType,
  DocType,
  Me,
  Position,
  PositionDetail,
} from "./types";

/**
 * MVP 목업. 실제 API 연동 시 이 파일의 함수 시그니처만 유지한 채
 * fetch 구현으로 바꾸면 컴포넌트는 그대로 재사용된다.
 */

export const ME = {
  name: "김서준",
  initials: "서준",
  role: "백엔드 개발자 · 4년차",
  /** 이력 완성도 (%) */
  completeness: 78,
  /** 아직 안 채운 이력 유형 (백엔드 completeness()의 missing 배열과 대응) */
  missing: ["포트폴리오"],
};

/** 사이드바 "이번 주 현황" 위젯. 목록 데이터에서 파생 가능한 값들. */
export const SIDEBAR_STATS = {
  positionCount: 24,
  docCount: 3,
  topFitScore: 92,
  appliedCount: 2,
  newPositions: 5,
};

const REQUIREMENTS: PositionDetail["requirements"] = [
  {
    name: "Python 3년 이상",
    required: true,
    weight: 0.3,
    fulfillment: 1.0,
    evidence: "경력 4년 · 카카오페이/라인",
  },
  {
    name: "대용량 트랜잭션 처리",
    required: true,
    weight: 0.25,
    fulfillment: 1.0,
    evidence: "일 300만 건 정산 배치",
  },
  {
    name: "AWS 운영 경험",
    required: true,
    weight: 0.2,
    fulfillment: 1.0,
    evidence: "AWS SAA 보유 · EKS 운영",
  },
  {
    name: "Kubernetes 설계 경험",
    required: true,
    weight: 0.15,
    fulfillment: 0.5,
    evidence: "운영 참여 · 설계 경험 없음",
  },
  {
    name: "Kafka / 메시징",
    required: false,
    weight: 0.07,
    fulfillment: 1.0,
    evidence: "라인 메시징 API 개발",
  },
  {
    name: "팀 리딩 경험",
    required: false,
    weight: 0.03,
    fulfillment: 0.0,
    evidence: "해당 이력 없음",
  },
];

/**
 * 위 REQUIREMENTS 의 Σ(가중치 × 충족도).
 * 목업 포지션이 모두 같은 요구조건을 공유하므로 값도 하나다.
 * fitScore 와의 차이가 상세 화면의 "보정" 행으로 표시된다.
 */
const FULFILLMENT_SUM = 0.895;

const POSITIONS: PositionDetail[] = [
  {
    id: "toss-backend-platform",
    company: "토스",
    title: "백엔드 엔지니어 (플랫폼)",
    location: "서울 강남",
    experience: "3~7년",
    tags: ["Python", "AWS", "대용량"],
    fitScore: 92,
    fulfillmentSum: FULFILLMENT_SUM,
    collectedAt: "2026.07.12",
    sourceUrl: "https://example.com/toss/backend",
    requirements: REQUIREMENTS,
    advice: [
      "결제 시스템 경험을 맨 앞에 두세요. 공고가 “대용량 트랜잭션”을 세 번 언급합니다. 카카오페이 정산 배치(일 300만 건) 경험이 가장 강한 근거입니다.",
      "Kubernetes는 “운영 참여” 수준으로 정직하게 쓰세요. 직접 클러스터를 설계한 이력은 없으니, EKS 위 서비스 배포·모니터링 경험으로 범위를 좁혀 적는 편이 신뢰를 얻습니다.",
      "팀 리딩은 공백입니다. 대신 신입 온보딩 문서 작성, 코드 리뷰 주도 경험을 리딩의 근거로 배치하면 감점 폭을 줄일 수 있습니다.",
    ],
  },
  {
    id: "daangn-search",
    company: "당근",
    title: "서버 개발자 (검색)",
    location: "서울 서초",
    experience: "3년+",
    tags: ["Go", "Elasticsearch"],
    fitScore: 78,
    fulfillmentSum: FULFILLMENT_SUM,
    collectedAt: "2026.07.11",
    sourceUrl: "https://example.com/daangn/search",
    requirements: REQUIREMENTS,
    advice: [
      "오픈소스 notify-hub(Go)를 첫 문단에 배치하세요. Go 실무 경력이 짧은 만큼, 340 스타의 운영 경험이 가장 확실한 증거입니다.",
      "Elasticsearch 경험은 없습니다. 검색 대신 “대용량 데이터 파이프라인” 각도로 접근하는 편이 설득력 있습니다.",
      "정산 배치의 성능 개선 수치(6시간 → 40분)를 그대로 옮기세요. 검색 팀도 지연 시간에 민감합니다.",
    ],
  },
  {
    id: "musinsa-payment",
    company: "무신사",
    title: "백엔드 개발자 (결제)",
    location: "서울 성수",
    experience: "4~8년",
    tags: ["Java", "MSA", "결제"],
    fitScore: 64,
    fulfillmentSum: FULFILLMENT_SUM,
    collectedAt: "2026.07.10",
    sourceUrl: "https://example.com/musinsa/payment",
    requirements: REQUIREMENTS,
    advice: [
      "결제 도메인 이해도는 최상위입니다. Java 경험 부족을 도메인 지식으로 상쇄하는 구조로 쓰세요.",
      "Java/Spring은 학습 중임을 명시하고, Python·Go로 만든 동등한 구조를 예시로 드세요.",
      "MSA 전환 경험이 없다면 모놀리식에서 겪은 한계와 개선 시도를 구체적으로 적으세요.",
    ],
  },
  {
    id: "banksalad-platform",
    company: "뱅크샐러드",
    title: "플랫폼 엔지니어",
    location: "서울 역삼",
    experience: "5년+",
    tags: ["Kubernetes", "Go"],
    fitScore: 51,
    fulfillmentSum: FULFILLMENT_SUM,
    collectedAt: "2026.07.09",
    sourceUrl: "https://example.com/banksalad/platform",
    requirements: REQUIREMENTS,
    advice: [
      "요구 연차(5년+)에 미달합니다. 연차 대신 담당 범위의 크기로 설득하세요.",
      "Kubernetes 설계 경험이 핵심 요구인데 운영 참여 수준입니다. 무리하게 부풀리지 마세요.",
      "지금 지원하기보다, 6개월 뒤 클러스터 설계 경험을 쌓은 후를 권합니다.",
    ],
  },
  {
    id: "kurly-logistics",
    company: "컬리",
    title: "백엔드 엔지니어 (물류)",
    location: "서울 강남",
    experience: "2~5년",
    tags: ["Kotlin", "Spring"],
    fitScore: 37,
    fulfillmentSum: FULFILLMENT_SUM,
    collectedAt: "2026.07.08",
    sourceUrl: "https://example.com/kurly/logistics",
    requirements: REQUIREMENTS,
    advice: [
      "필수 스택(Kotlin/Spring)과 이력이 거의 겹치지 않습니다.",
      "물류 도메인 경험도 없어 현재 이력으로는 설득이 어렵습니다.",
      "다른 포지션에 시간을 쓰는 편이 낫습니다.",
    ],
  },
];

const CREDENTIALS: { type: CredentialType; title: string; detail: string; status?: string }[] = [
  {
    type: "career",
    title: "카카오페이 · 백엔드 개발자",
    detail: "2023.03 ~ 재직 중 · 결제 정산 시스템, 일 300만 건 배치",
    status: "재직 중",
  },
  {
    type: "career",
    title: "라인플러스 · 서버 개발자",
    detail: "2022.01 ~ 2023.02 · 메시징 API, Python/Django",
    status: "1년 2개월",
  },
  {
    type: "certificate",
    title: "정보처리기사",
    detail: "한국산업인력공단 · 2021.11 취득",
    status: "보유",
  },
  {
    type: "certificate",
    title: "AWS Solutions Architect – Associate",
    detail: "Amazon Web Services · 2024.06 취득",
    status: "보유",
  },
  {
    type: "portfolio",
    title: "실시간 알림 서버 (오픈소스)",
    detail: "github.com/seojun/notify-hub · Go, Redis, 스타 340",
  },
];

/* ── 데이터 접근 함수 (lib/data.ts 가 api.ts 와 교체하는 지점) ── */

export async function listPositions(): Promise<Position[]> {
  return [...POSITIONS].sort((a, b) => b.fitScore - a.fitScore);
}

export async function getPosition(id: string): Promise<PositionDetail | undefined> {
  return POSITIONS.find((p) => p.id === id);
}

/** 목업에선 계산할 게 없다. data.ts 의 시그니처를 맞추기 위한 no-op. */
export async function recalculate(): Promise<void> {}

/* ── F2 이력 목업: 실 API 시그니처를 흉내낸다 ── */

export async function getMe(): Promise<Me> {
  return { id: 1, name: ME.name, email: "seojun@hub.dev", completeness: ME.completeness };
}

// 기존 CREDENTIALS 를 복사해 런타임에 추가/삭제가 반영되게 한다.
let mockCredentials: Credential[] = CREDENTIALS.map((c, i) => ({
  id: i + 1,
  type: c.type,
  title: c.title,
  detail: c.detail,
  startedOn: null,
  endedOn: null,
  ongoing: c.status === "재직 중" || c.status === "보유",
}));

let mockCredSeq = mockCredentials.length;

export async function listCredentials(): Promise<Credential[]> {
  return [...mockCredentials];
}

export async function createCredential(body: CredentialInput): Promise<Credential> {
  const created: Credential = {
    id: ++mockCredSeq,
    type: body.type,
    title: body.title,
    detail: body.detail,
    startedOn: body.startedOn ?? null,
    endedOn: body.endedOn ?? null,
    ongoing: !body.endedOn,
  };
  mockCredentials = [...mockCredentials, created];
  return created;
}

export async function deleteCredential(id: number): Promise<void> {
  mockCredentials = mockCredentials.filter((c) => c.id !== id);
}

/* ── F6 목업: 실 API 시그니처를 흉내낸다 ── */

let mockJobSeq = 1000;

export async function generateDoc(postingId: number, type: DocType) {
  const id = ++mockJobSeq;
  return { id, status: "PENDING" as const };
}

export async function pollDoc(id: number): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  return "[목업 문서]\n\n실 API 모드에서 실제 생성 결과가 여기 표시됩니다.";
}

export async function saveDoc(id: number, content: string) {
  return { id, status: "DONE" as const };
}