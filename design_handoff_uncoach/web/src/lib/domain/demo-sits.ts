// 시안 picker 카드(pi_2 대화 / pi_5 메일 / pi_4 뉴스)에 대응하는 실제 채점 시나리오.
// 카드 디자인은 그대로 두고, 카드별로 이 정의를 채점 상황으로 연결한다(카드별 실채점).
// Home/History 기록 표시도 같은 정의를 공유해 제목을 해석한다.
import type { Situation } from "./types";

// ── 대화(pi_2) — ChatPicker 카드 순서와 동일: [고객협상(featured), 팀회의, 구직면접, 동료갈등, 첫인사] ──
export const CHAT_SITS: Situation[] = [
  {
    id: "chat-negotiation",
    rel: "고객",
    title: "고객 협상",
    counterpart: "까다로운 조건을 제시하는 고객",
    goal: "무리한 요구 속에서도 관계를 지키며 서로 수용 가능한 윈윈 합의점을 이끌어낸다",
    tension: "고객이 예산 초과를 이유로 강하게 압박하며 이탈을 시사한다",
    direction: "방어·변명보다 상대의 니즈를 인정하고 대안을 제시해 신뢰를 유지한다",
    axis: "strategy",
    medium: "chat",
    opener: "안녕하세요, 저희가 요청한 조건들 검토해 보셨나요? 솔직히 지금 견적은 예산을 한참 넘습니다. 조정이 안 되면 다른 업체도 알아봐야 할 것 같아요.",
  },
  {
    id: "chat-meeting",
    rel: "팀원",
    title: "팀 회의 조율",
    counterpart: "의견이 충돌하는 팀원",
    goal: "감정 충돌을 가라앉히고 서로의 입장을 조율해 회의를 생산적으로 이끈다",
    tension: "팀원이 일정에 강하게 반발하며 분위기가 경직되어 있다",
    direction: "한쪽 편을 들기보다 공통 목표를 상기시키고 절충안을 함께 찾는다",
    axis: "context",
    medium: "chat",
    opener: "저는 이번 일정은 현실적으로 무리라고 봅니다. 다른 분들 생각은 모르겠지만, 계속 이렇게 밀어붙이면 결국 품질이 떨어질 거예요.",
  },
  {
    id: "chat-interview",
    rel: "면접관",
    title: "구직 면접 대비",
    counterpart: "압박 면접을 진행하는 면접관",
    goal: "압박 질문에도 침착하고 논리적으로 자신의 역량을 어필한다",
    tension: "면접관이 약점을 파고드는 날카로운 질문을 던진다",
    direction: "방어적으로 회피하지 말고 솔직하게 인정하되 보완 노력을 함께 제시한다",
    axis: "register",
    medium: "chat",
    opener: "자, 그럼 바로 시작하죠. 본인의 가장 큰 약점이 무엇이고, 그것이 이 직무에 어떤 영향을 줄 수 있다고 생각하시나요?",
  },
  {
    id: "chat-conflict",
    rel: "동료",
    title: "동료와의 갈등 해결",
    counterpart: "업무 방식이 다른 동료",
    goal: "감정을 격화시키지 않고 건설적으로 피드백을 주고받아 관계를 회복한다",
    tension: "동료가 서운함을 드러내며 협업에 불편함을 표한다",
    direction: "상대의 감정을 먼저 인정하고 나의 입장은 '나 전달법'으로 부드럽게 전한다",
    axis: "register",
    medium: "chat",
    opener: "솔직히 말할게요. 지난번 프로젝트 때 그 방식 때문에 좀 힘들었어요. 제 의견은 잘 반영되지 않는 것 같았거든요.",
  },
  {
    id: "chat-smalltalk",
    rel: "새 동료",
    title: "첫 인사 및 스몰토크",
    counterpart: "처음 만난 새 동료",
    goal: "어색함을 자연스럽게 풀며 가벼운 스몰토크로 좋은 첫인상을 남긴다",
    tension: "서로 잘 모르는 사이라 대화가 끊기기 쉽다",
    direction: "과하지 않게 공통 화제를 찾아 편안한 분위기를 만든다",
    axis: "context",
    medium: "chat",
    opener: "안녕하세요! 이번에 새로 합류하셨죠? 반가워요. 혹시 이 근처는 좀 익숙하세요?",
  },
];

// 기존 pi_7 기본 시나리오(불만 고객) — 선택 없이 들어올 때의 기본값 + 기록 해석용.
export const CHAT_COMPLAINT_SIT: Situation = {
  id: "chat-complaint",
  rel: "불만 고객",
  title: "파손 상품 배송 불만 응대",
  counterpart: "온라인 주문 고객(김지수)",
  goal: "격앙된 감정을 가라앉히고, 명확한 사과와 함께 환불·교환 등 구체적 해결책을 신속히 제시한다",
  tension: "포장 파손·상품 파손으로 고객이 크게 화가 났고 즉각적인 보상을 요구한다",
  direction: "형식적 절차 안내(사진 요구 등)보다 진심 어린 사과와 신속한 처리 확신을 먼저 준다",
  axis: "register",
  medium: "chat",
  opener: "안녕하세요. 어제 주문한 상품 받았는데 포장이 다 뜯어져 있고 안에 물건도 깨져있네요. 이거 어떻게 된 겁니까?",
};

// ── 메일(pi_5) — MailPicker 카드 순서와 동일 ──
export const MAIL_SITS: Situation[] = [
  {
    id: "mail-delay",
    rel: "클라이언트",
    title: "프로젝트 지연 공지",
    counterpart: "외부 클라이언트",
    goal: "예상치 못한 지연을 정중하고 책임감 있게 알리고, 최종 납기에 영향 없음을 확신시키며 다음 조치를 명확히 안내한다",
    tension: "지연은 부정적 소식이라 자칫 신뢰를 잃을 수 있다",
    direction: "변명보다 사실·사과·구체적 대책·명확한 다음 일정을 담는다",
    axis: "strategy",
    medium: "email",
  },
  {
    id: "mail-followup",
    rel: "미팅 참석자",
    title: "미팅 팔로업 메일",
    counterpart: "함께 미팅한 상대",
    goal: "논의된 주요 안건을 간결히 요약하고 다음 스텝을 가볍고 명확하게 공유한다",
    tension: "너무 딱딱하지 않게, 그러나 빠뜨림 없이 정리해야 한다",
    direction: "핵심 결정·담당·기한을 불릿으로 정리하고 친근한 톤을 유지한다",
    axis: "strategy",
    medium: "email",
  },
  {
    id: "mail-proposal",
    rel: "잠재 고객사",
    title: "공식 제안서 발송",
    counterpart: "신규 프로젝트 발주 담당자",
    goal: "신규 수주를 위한 제안서와 견적을 격식 있고 신뢰감 있게 제출한다",
    tension: "매우 격식 있는 자리라 사소한 실수도 인상을 해칠 수 있다",
    direction: "정중한 인사·명확한 제안 요지·첨부 안내·정중한 맺음말을 갖춘다",
    axis: "register",
    medium: "email",
  },
  {
    id: "mail-ooo",
    rel: "메일 발신자",
    title: "부재중 자동 응답",
    counterpart: "휴가 중 메일을 보낼 상대",
    goal: "부재 기간·업무 대직자·긴급 연락처를 명확하고 간결하게 안내한다",
    tension: "정보 누락 없이 짧고 실무적으로 써야 한다",
    direction: "부재 기간, 대직자와 연락처, 회신 예정일을 빠짐없이 담는다",
    axis: "context",
    medium: "email",
  },
  {
    id: "mail-apology",
    rel: "상사",
    title: "실수 사과 및 대책 보고",
    counterpart: "보고를 받을 상사",
    goal: "실수를 솔직히 인정하고 원인·즉각 조치·재발 방지책을 진중하게 보고한다",
    tension: "변명으로 비치면 신뢰를 잃고, 사과만 하면 무책임해 보인다",
    direction: "사과 → 사실 → 즉각 조치 → 재발 방지 순으로 진중하게 정리한다",
    axis: "strategy",
    medium: "email",
  },
];

export const DEMO_SITS: Situation[] = [...CHAT_SITS, CHAT_COMPLAINT_SIT, ...MAIL_SITS];
