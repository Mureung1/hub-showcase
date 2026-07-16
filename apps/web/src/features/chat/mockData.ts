import type { AnswerSection, Provider } from "./types";

/** Mock Manager Agenda 템플릿의 입장 1건 — sourceAnswerId는 생성 시점에 매핑한다 */
export interface MockStanceTemplate {
  provider: Provider;
  text: string;
  /** 근거가 된 Mock Section의 sectionId (mockSectionsByProvider와 일치해야 함) */
  sectionIds: string[];
}

export interface MockAgendaTemplate {
  kind: "consensus" | "conflict";
  title: string;
  summary: string;
  stances: MockStanceTemplate[];
  /** Consensus 합의 내용 — conflict는 사용자 판단 시 채워지므로 null */
  selectedContent: string | null;
  /** 재검토 요청 시 반환되는 Mock Manager 재검색 결과 (conflict 전용) */
  recheckResult?: string;
}

/** SPEC-UI-001 0.6 — Mock 인증 완료 사용자 */
export const mockUser = {
  id: "user-1",
  email: "demo@example.com",
  emailVerified: true,
} as const;

/** MVP AI Provider 3종 표시 정보 — 표시 라벨은 Claude·ChatGPT·Gemini (docs/DESIGN.md 4장),
 * 내부 provider 식별자(`openai` 등)와는 분리해 유지한다. */
export const providerMeta: ReadonlyArray<{ id: Provider; label: string }> = [
  { id: "claude", label: "Claude" },
  { id: "openai", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
];

/** 첫 진입 빈 화면의 예시 질문 칩 (Step 1-3: 클릭 시 입력창에 채워짐) */
export const exampleQuestions: readonly string[] = [
  "Supabase와 Firebase 중 어떤 것이 우리 서비스에 적합할까?",
  "MVP 단계에서 상태관리 라이브러리를 도입해야 할까?",
  "웹 서비스 배포는 Vercel과 AWS 중 무엇으로 시작할까?",
];

/** Step 1-3 결정: 첫 진입 인사 문구 (반복 개선 라운드에서 조정 가능) */
export const emptyStateGreeting = "무엇을 결정해야 하나요?";

/** all-rejected 고정 문구 (Step 7-3 — 유도 버튼 없이 이 문구만 표시) */
export const allRejectedFinalAnswerContent =
  "모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다.";

/**
 * Mock FinalAnswer 본문 — 요약이 아니라 상세한 완전 답변 (Step 7-1).
 * Consensus와 해결된 Conflict의 selectedContent를 근거로 원 질문에 다시 답한 전문.
 */
export const mockFinalAnswerContent = `Supabase에서 RLS를 설정할 때의 출발점은 public 스키마의 모든 테이블에 RLS를 기본 ON으로 켜는 것입니다. RLS를 켜면 정책이 정의되기 전까지 모든 접근이 차단되므로, RLS 활성화와 접근 정책 작성은 반드시 하나의 작업 단위로 진행해야 합니다. 개발 초기에 "데이터가 안 보인다"는 문제의 대부분은 이 원칙을 지키지 않아 발생하는 정책 누락이 원인입니다.

정책은 select, insert, update, delete를 목적별로 나눠 정의하는 것이 좋습니다. 사용자 소유 데이터라면 auth.uid() = user_id 조건을 기본형으로 하되, insert에는 with check로 다른 사용자 명의의 행 생성을 막고 update에는 using과 with check를 함께 정의해 소유권 이전을 차단합니다. 정책 조건에 사용되는 컬럼에는 인덱스를 만들어 성능 저하를 예방하고, 정책 이름에는 대상 역할과 목적을 담아 감사 가능성을 확보하세요.

정책의 작성 위치와 키 취급은 위의 결정 사항을 따릅니다. 확정된 정책은 버전 관리되는 위치에서 일관되게 유지하고, RLS를 우회하는 권한(service_role 등)은 사용자 요청 경로와 분리된 서버 환경에만 두는 것이 안전합니다. 마지막으로 배포 전에는 다른 사용자 계정으로 접근 시나리오를 직접 테스트해 각 정책이 의도대로 동작하는지 확인하고, 모든 public 테이블에 RLS가 켜져 있는지와 정책 없는 테이블이 의도된 것인지를 점검 체크리스트로 관리하세요.`;

/**
 * 성공한 SourceAnswer에 채우는 Provider별 Mock Section (0.6 임시 계약).
 * 렌더링은 전문 스타일로 이어붙이지만 내부 데이터는 sectionId를 가진
 * Section 배열 구조를 유지한다 (Step 4-3 고정 계약 — Agenda 근거 추적용).
 */
export const mockSectionsByProvider: Record<
  Provider,
  readonly AnswerSection[]
> = {
  claude: [
    {
      sectionId: "claude-s1",
      title: "요약",
      content:
        "RLS(Row Level Security)는 사용자별 데이터 접근을 테이블 단위가 아니라 행 단위로 제어하는 PostgreSQL의 핵심 보안 기능입니다. Supabase는 이 기능을 그대로 노출하므로, 정책이 없으면 기본적으로 모든 접근이 차단됩니다. 즉 RLS를 켜는 행위 자체가 보안을 만드는 것이 아니라, 정책을 어떻게 작성하느냐가 실제 보안 수준을 결정합니다.",
    },
    {
      sectionId: "claude-s2",
      title: "기본 원칙",
      content:
        "가장 중요한 원칙은 기본 거부(deny by default)입니다. 모든 public 스키마 테이블에 RLS를 기본 ON으로 켜고, 필요한 접근만 정책으로 명시적으로 허용하세요. 정책이 하나도 없는 테이블은 어떤 클라이언트도 읽거나 쓸 수 없는 상태가 되며, 이것이 안전한 출발점입니다.",
    },
    {
      sectionId: "claude-s3",
      title: "정책 작성 위치",
      content:
        "정책은 SQL 마이그레이션 파일로 작성해 버전 관리하는 것을 권장합니다. 대시보드에서 임시로 만든 정책은 환경 간 불일치를 만들기 쉽고, 코드 리뷰를 거치지 않아 실수를 놓치기 쉽습니다. supabase/migrations 폴더에 정책 변경 이력을 남기면 스테이징과 프로덕션을 동일하게 유지할 수 있습니다.",
    },
    {
      sectionId: "claude-s4",
      title: "정책 구성 예시",
      content:
        "사용자 소유 데이터라면 select, insert, update, delete 각각에 대해 auth.uid() = user_id 조건을 거는 것이 기본형입니다. insert에는 with check를 사용해 다른 사용자의 user_id로 행을 만드는 것을 막고, update에는 using과 with check를 함께 정의해 소유권 이전을 차단하세요.",
    },
    {
      sectionId: "claude-s5",
      title: "주의사항",
      content:
        "service_role 키는 RLS를 우회하므로 반드시 서버 환경에서만 사용해야 합니다. 또한 뷰(view)는 기본적으로 생성자 권한으로 실행되어 RLS를 우회할 수 있으므로 security_invoker 옵션을 확인하세요. Storage와 Realtime에도 별도의 정책이 필요하다는 점을 잊기 쉽습니다.",
    },
    {
      sectionId: "claude-s6",
      title: "검증 방법",
      content:
        "정책을 만든 뒤에는 반드시 다른 사용자 계정으로 접근 시나리오를 테스트하세요. Supabase 대시보드의 SQL Editor에서 set request.jwt.claims를 이용하면 특정 사용자로 가장한 쿼리를 실행해 정책이 의도대로 동작하는지 확인할 수 있습니다.",
    },
  ],
  openai: [
    {
      sectionId: "openai-s1",
      title: "요약",
      content:
        "RLS를 켜면 정책이 정의되기 전까지는 모든 행 접근이 막힙니다. 따라서 RLS 활성화와 정책 작성은 하나의 작업 단위로 취급해야 하며, 켜기만 하고 정책을 잊으면 앱이 데이터를 전혀 읽지 못하는 장애처럼 보이는 상황이 발생합니다.",
    },
    {
      sectionId: "openai-s2",
      title: "빠른 시작",
      content:
        "처음이라면 Supabase 대시보드의 Policies 화면에서 제공하는 템플릿으로 시작하는 것이 빠릅니다. 'Enable read access for authenticated users' 같은 기본 템플릿을 적용해 동작을 확인한 뒤, auth.uid() 기준으로 행을 제한하는 조건을 추가하는 순서로 진행하면 시행착오를 줄일 수 있습니다.",
    },
    {
      sectionId: "openai-s3",
      title: "정책 세분화",
      content:
        "select, insert, update, delete를 하나의 정책으로 묶기보다 목적별로 나눠 정의하세요. 읽기는 넓게 허용하되 쓰기는 소유자에게만 허용하는 식의 비대칭 정책이 일반적이며, 정책이 분리되어 있어야 나중에 요구사항이 바뀔 때 영향 범위를 좁게 유지할 수 있습니다.",
    },
    {
      sectionId: "openai-s4",
      title: "성능 고려",
      content:
        "RLS 정책은 모든 쿼리에 where 조건처럼 결합되므로 성능에 영향을 줍니다. 정책 조건에 사용되는 컬럼(user_id 등)에는 인덱스를 만들고, 서브쿼리가 들어가는 복잡한 정책은 security definer 함수로 감싸 캐시하는 패턴을 고려하세요.",
    },
    {
      sectionId: "openai-s5",
      title: "주의사항",
      content:
        "정책 없이 RLS만 켜면 앱이 데이터를 읽지 못해 오류처럼 보일 수 있습니다. 개발 초기에 '데이터가 안 보인다'는 문제의 대부분은 RLS 정책 누락이 원인입니다. 또한 익명 사용자(anon)와 인증 사용자(authenticated) 역할을 구분해 정책을 작성해야 의도치 않은 공개를 막을 수 있습니다.",
    },
    {
      sectionId: "openai-s6",
      title: "운영 팁",
      content:
        "대시보드에서 검증을 마친 정책은 최종적으로 마이그레이션 파일로 옮겨 관리하는 것이 안전합니다. 정책 변경은 배포와 함께 롤백할 수 있어야 하고, 어떤 테이블에 어떤 정책이 있는지 pg_policies 뷰로 주기적으로 점검하는 것을 권장합니다.",
    },
  ],
  gemini: [
    {
      sectionId: "gemini-s1",
      title: "요약",
      content:
        "RLS는 PostgreSQL의 행 수준 보안을 Supabase에서 그대로 활용하는 방식으로, 테이블마다 접근 규칙을 세밀하게 정의할 수 있습니다. 클라이언트가 어떤 쿼리를 보내든 데이터베이스 계층에서 행 단위 필터링이 강제된다는 점이 애플리케이션 레벨 검증과의 가장 큰 차이입니다.",
    },
    {
      sectionId: "gemini-s2",
      title: "활성화 절차",
      content:
        "alter table ... enable row level security 구문으로 테이블별로 켭니다. Supabase에서 새로 만드는 테이블은 대시보드 기준 기본으로 RLS가 켜지지만, SQL로 직접 만든 테이블은 꺼져 있을 수 있으므로 생성 직후 상태를 확인하는 습관이 필요합니다.",
    },
    {
      sectionId: "gemini-s3",
      title: "정책 관리",
      content:
        "public 테이블에 RLS를 켜고 정책은 SQL 파일로 관리하되, select/insert/update/delete를 나눠 정의하는 것을 권장합니다. 정책 이름에 대상 역할과 목적을 담아 두면(예: 'profiles_select_own') 수십 개의 정책이 쌓여도 감사를 수행하기 쉽습니다.",
    },
    {
      sectionId: "gemini-s4",
      title: "역할과 키",
      content:
        "service_role 키를 클라이언트에 노출하면 안 되며, 프론트엔드에는 공개 가능한 키만 두어야 합니다. 공개 키로 접근하는 요청은 anon 또는 authenticated 역할로 실행되므로, 이 두 역할에 대해서만 정책을 열어 두면 서버 전용 작업과 사용자 요청의 권한 경계가 자연스럽게 나뉩니다.",
    },
    {
      sectionId: "gemini-s5",
      title: "협업 데이터 모델",
      content:
        "팀·조직 단위 공유 데이터라면 소유자 컬럼 비교만으로는 부족합니다. 멤버십 테이블을 참조하는 exists 서브쿼리 정책을 사용하거나, 자주 쓰이는 판정 로직은 is_member(org_id) 같은 SQL 함수로 추출해 정책 간에 재사용하세요.",
    },
    {
      sectionId: "gemini-s6",
      title: "점검 체크리스트",
      content:
        "배포 전에 다음을 확인하세요. 모든 public 테이블에 RLS가 켜져 있는가, 정책 없는 테이블이 의도된 것인가, service_role 키가 클라이언트 번들에 포함되지 않았는가, 그리고 각 정책이 테스트 계정으로 검증되었는가입니다.",
    },
  ],
};

/**
 * happy-path 기본 Mock Manager 비교 결과: Consensus 1건 + Conflict 2건 (0.5 시나리오 구성).
 * 각 stance의 sectionIds는 위 mockSectionsByProvider의 실제 sectionId를 참조한다.
 */
export const mockAgendaTemplates: readonly MockAgendaTemplate[] = [
  {
    kind: "consensus",
    title: "public 테이블 RLS 기본 ON",
    summary:
      "세 AI 모두 public 스키마의 모든 테이블에 RLS를 기본으로 켜야 한다는 데 동의했습니다.",
    selectedContent:
      "모든 public 테이블에 RLS를 기본 ON으로 켠다. 정책이 정의되기 전까지 모든 접근이 차단되므로, RLS 활성화와 정책 작성을 하나의 작업 단위로 진행한다.",
    stances: [
      {
        provider: "claude",
        text: "모든 public 테이블에 RLS를 기본 ON으로 켜고 필요한 접근만 명시적으로 허용",
        sectionIds: ["claude-s2"],
      },
      {
        provider: "openai",
        text: "RLS 활성화와 정책 작성을 하나의 작업 단위로 취급",
        sectionIds: ["openai-s1"],
      },
      {
        provider: "gemini",
        text: "테이블별로 RLS를 켜고 생성 직후 상태를 확인",
        sectionIds: ["gemini-s2"],
      },
    ],
  },
  {
    kind: "conflict",
    title: "정책 작성 위치",
    summary: "정책을 어디서 만들고 관리할지에 대해 의견이 갈립니다.",
    selectedContent: null,
    recheckResult:
      "공식 문서 기준으로 정책은 SQL 마이그레이션 파일로 작성해 버전 관리하는 것이 권장됩니다. 대시보드는 빠른 검증 용도로만 사용하고, 확정된 정책은 마이그레이션으로 이관하는 절차가 안전합니다.",
    // R1: stance 텍스트는 5줄 이상 분량으로 유지한다 (Step 6 개정 — 판단 근거가 되도록, 한 줄 요약 금지)
    stances: [
      {
        provider: "claude",
        text: "SQL 마이그레이션 파일로 작성해 버전 관리하는 것을 권장합니다. 대시보드에서 임시로 만든 정책은 환경 간 불일치를 만들기 쉽고, 코드 리뷰를 거치지 않아 실수를 놓치기 쉽습니다. supabase/migrations 폴더에 정책 변경 이력을 남기면 스테이징과 프로덕션을 동일하게 유지할 수 있고, 문제가 생겼을 때 어느 배포에서 정책이 바뀌었는지 추적할 수 있습니다. 정책 변경도 코드 변경과 같은 리뷰 절차를 거치는 것이 안전합니다.",
        sectionIds: ["claude-s3"],
      },
      {
        provider: "openai",
        text: "처음이라면 Supabase 대시보드의 Policies 화면에서 제공하는 템플릿으로 시작하는 것이 빠릅니다. 기본 템플릿을 적용해 동작을 확인한 뒤 auth.uid() 기준으로 행을 제한하는 조건을 추가하는 순서로 진행하면 시행착오를 줄일 수 있습니다. 대시보드에서 검증을 마친 정책은 최종적으로 마이그레이션 파일로 옮겨 관리하고, 어떤 테이블에 어떤 정책이 있는지 pg_policies 뷰로 주기적으로 점검하는 것을 권장합니다.",
        sectionIds: ["openai-s2", "openai-s6"],
      },
      {
        provider: "gemini",
        text: "public 테이블에 RLS를 켜고 정책은 SQL 파일로 관리하되, select/insert/update/delete를 나눠 정의하는 것을 권장합니다. 정책 이름에 대상 역할과 목적을 담아 두면(예: 'profiles_select_own') 수십 개의 정책이 쌓여도 감사를 수행하기 쉽습니다. 이름 규칙이 없으면 정책이 늘어날수록 어떤 정책이 왜 존재하는지 파악하기 어려워지므로, 초기부터 명명 규칙을 세워 일관되게 적용하는 것이 좋습니다.",
        sectionIds: ["gemini-s3"],
      },
    ],
  },
  {
    kind: "conflict",
    title: "service_role 키 취급",
    summary: "service_role 키의 사용 범위에 대한 강조점이 다릅니다.",
    selectedContent: null,
    recheckResult:
      "공식 문서 기준으로 service_role 키는 서버 전용이며 클라이언트에 노출하지 않는 것이 권장됩니다. 프론트엔드에는 공개 가능한 키만 두고, RLS 우회가 필요한 시스템 작업은 서버 환경에서만 수행합니다.",
    stances: [
      {
        provider: "claude",
        text: "service_role 키는 RLS를 우회하므로 반드시 서버 환경에서만 사용해야 합니다. 또한 뷰(view)는 기본적으로 생성자 권한으로 실행되어 RLS를 우회할 수 있으므로 security_invoker 옵션을 함께 확인하세요. Storage와 Realtime에도 별도의 정책이 필요하다는 점을 잊기 쉽습니다. 키 자체의 보관뿐 아니라 RLS가 우회되는 모든 경로(뷰, 함수, 확장 기능)를 목록화해 점검하는 것이 안전합니다.",
        sectionIds: ["claude-s5"],
      },
      {
        provider: "openai",
        text: "익명 사용자(anon)와 인증 사용자(authenticated) 역할을 구분해 정책을 작성해야 의도치 않은 공개를 막을 수 있습니다. 정책 없이 RLS만 켜면 앱이 데이터를 읽지 못해 오류처럼 보일 수 있고, 개발 초기에 '데이터가 안 보인다'는 문제의 대부분은 RLS 정책 누락이 원인입니다. 역할별로 필요한 최소 권한만 여는 것을 기본으로 하고, 공개 범위를 넓힐 때는 그 사유를 정책 이름이나 주석에 남기세요.",
        sectionIds: ["openai-s5"],
      },
      {
        provider: "gemini",
        text: "service_role 키를 클라이언트에 노출하면 안 되며, 프론트엔드에는 공개 가능한 키만 두어야 합니다. 공개 키로 접근하는 요청은 anon 또는 authenticated 역할로 실행되므로, 이 두 역할에 대해서만 정책을 열어 두면 서버 전용 작업과 사용자 요청의 권한 경계가 자연스럽게 나뉩니다. 배포 전에 클라이언트 번들에 비밀 키가 포함되지 않았는지 검사하는 절차를 CI에 넣어 두면 실수를 예방할 수 있습니다.",
        sectionIds: ["gemini-s4"],
      },
    ],
  },
];

/**
 * all-rejected 시나리오 전용 fixture: Consensus 0건 + Conflict 2건 (0.5).
 * 모든 Agenda(전부 Conflict)를 제외해야만 all_agendas_rejected 고정 문구가 나온다.
 */
export const mockAllRejectedAgendaTemplates: readonly MockAgendaTemplate[] =
  mockAgendaTemplates.filter((template) => template.kind === "conflict");

/**
 * single-source-fallback 시나리오 전용 fixture: 성공한 단일 Provider(Claude)의
 * 입장만 담는다 (0.5 Should).
 * 단일 SourceAnswer 기반 Agenda 처리 방식과 resolution_reason은 미확정이므로
 * (docs/status.md 미결정 사항 — Manager AI Spec에서 구체화) Mock에서는
 * Conflict 2건으로 단순화한다. 여러 AI의 비교가 없으므로 "합의/Consensus" 표현과
 * 자동 통과(auto_consensus) 라벨은 사용하지 않는다 (Step 7-4 고정: 합의로 표현 금지).
 */
export const mockSingleSourceAgendaTemplates: readonly MockAgendaTemplate[] = [
  {
    kind: "conflict",
    title: "정책 작성 위치",
    summary: "단일 AI 답변에 기반한 항목으로 사용자 확인이 필요합니다.",
    selectedContent: null,
    recheckResult:
      "공식 문서 기준으로 정책은 SQL 마이그레이션 파일로 작성해 버전 관리하는 것이 권장됩니다. 대시보드는 빠른 검증 용도로만 사용하고, 확정된 정책은 마이그레이션으로 이관하는 절차가 안전합니다.",
    stances: [
      {
        provider: "claude",
        text: "SQL 마이그레이션 파일로 작성해 버전 관리하는 것을 권장합니다. 대시보드에서 임시로 만든 정책은 환경 간 불일치를 만들기 쉽고, 코드 리뷰를 거치지 않아 실수를 놓치기 쉽습니다. supabase/migrations 폴더에 정책 변경 이력을 남기면 스테이징과 프로덕션을 동일하게 유지할 수 있고, 문제가 생겼을 때 어느 배포에서 정책이 바뀌었는지 추적할 수 있습니다. 정책 변경도 코드 변경과 같은 리뷰 절차를 거치는 것이 안전합니다.",
        sectionIds: ["claude-s3"],
      },
    ],
  },
  {
    kind: "conflict",
    title: "service_role 키 취급",
    summary: "단일 AI 답변에 기반한 항목으로 사용자 확인이 필요합니다.",
    selectedContent: null,
    recheckResult:
      "공식 문서 기준으로 service_role 키는 서버 전용이며 클라이언트에 노출하지 않는 것이 권장됩니다. 프론트엔드에는 공개 가능한 키만 두고, RLS 우회가 필요한 시스템 작업은 서버 환경에서만 수행합니다.",
    stances: [
      {
        provider: "claude",
        text: "service_role 키는 RLS를 우회하므로 반드시 서버 환경에서만 사용해야 합니다. 또한 뷰(view)는 기본적으로 생성자 권한으로 실행되어 RLS를 우회할 수 있으므로 security_invoker 옵션을 함께 확인하세요. Storage와 Realtime에도 별도의 정책이 필요하다는 점을 잊기 쉽습니다. 키 자체의 보관뿐 아니라 RLS가 우회되는 모든 경로(뷰, 함수, 확장 기능)를 목록화해 점검하는 것이 안전합니다.",
        sectionIds: ["claude-s5"],
      },
    ],
  },
];
