// Letter&Co 목 데이터 — docs/design/Letter&Co Design System.zip 의 templates/shared/mockData.js 이식본.
// 화면 개발용 기본 데이터만 담고, 스타일 관련 값은 두지 않는다.
//
// [실제 API 연결 시 필드명 매핑]
// 아래 목 데이터의 필드명은 디자인 템플릿 기준이며, Supabase 스키마/REST 응답과 다르다.
// API 연결 시 각 상수의 주석에 적힌 매핑을 따라 교체할 것. (camelCase는 모두 snake_case로 통일)

export const GROUP = {
  name: '한강 피크닉 모임',
  scr: 'SCR·1',
  members: ['정하은', '김도윤', '이서연', '박지호', '최유나'],
};

// href: 템플릿의 .dc.html 상대 경로를 CLAUDE.md 라우트로 치환함.
// icon은 프론트 전용 값 — API에는 존재하지 않는다.
export const NAV_ITEMS = [
  { key: 'home', icon: 'flower', label: '그룹 홈', href: '/scr4/home' },
  { key: 'participants', icon: 'mailbox', label: '참가자 현황', href: '/scr0/status' },
  { key: 'coordinate', icon: 'vine', label: '조율', href: '/scr1/schedule' },
  { key: 'progress', icon: 'sprout', label: '진행', href: '/scr4/workspace' },
  { key: 'harvest', icon: 'postcard', label: '결산', href: '/scr5/review' },
  { key: 'settlement', icon: 'leaf', label: '정산', href: '/scr5/settlement' },
  { key: 'notifications', icon: 'envelope', label: '알림함', href: '/notifications' },
  { key: 'profile', icon: 'seed', label: '내 정보', href: '/profile' },
];

// [API 매핑] PLACES → candidate_locations[]
// - name → label
// - reason → description
export const PLACES = [
  { id: 'p1', name: '반포한강공원 잔디밭', reason: '참가자 절반 이상의 이동 동선 기준 중간지점', votes: 3 },
  { id: 'p2', name: '망원한강공원 피크닉존', reason: '주차 공간과 편의시설이 가까움', votes: 2 },
  { id: 'p3', name: '뚝섬한강공원 자벌레 앞', reason: '대중교통 접근성이 가장 높음', votes: 1 },
];

export const TIME_SLOTS = [
  { id: 't1', label: '토 오후 2시', votes: 4 },
  { id: 't2', label: '토 오후 4시', votes: 2 },
  { id: 't3', label: '일 오전 11시', votes: 1 },
];

// [API 매핑] ROLES → roles
// - name → title
// - reason → description
// - assignee(이름 문자열) → assigned_participant_id(UUID)로 교체 필요
export const ROLES = [
  { id: 'r1', name: '자리 세팅', reason: '가장 먼저 도착 가능한 참가자에게 적합', assignee: '정하은', done: false },
  { id: 'r2', name: '먹거리 준비', reason: '지난 모임에서 담당했던 경험 있음', assignee: '김도윤', done: true },
  { id: 'r3', name: '사진 기록', reason: '이동 동선상 여유 있는 참가자', assignee: '이서연', done: false },
  { id: 'r4', name: '돗자리·용품', reason: '차량 이동이라 짐 운반이 수월함', assignee: '박지호', done: false },
];

// [API 매핑] CHECKLIST(역할 id → 문자열 배열) → tasks 테이블 구조로 변환 필요
// - 각 문자열 → { id, label, is_done } 레코드 (역할별 그룹핑은 role_id 외래키로)
export const CHECKLIST = {
  r1: ['도착 30분 전 자리 확보', '그늘 위치 확인', '주변 참가자에게 위치 공유'],
  r2: ['간식 목록 정리', '음료 구매', '알레르기 여부 확인'],
  r3: ['단체 사진 타이밍 공지', '촬영본 공유 링크 준비'],
  r4: ['돗자리 2개', '보냉백', '휴대용 스피커'],
};

// [API 매핑] EXPENSES → expenses
// - paidBy(이름 문자열) → payer_participant_id(UUID)로 교체 필요
// - camelCase는 snake_case로 통일 (paidBy → payer_participant_id)
export const EXPENSES = [
  { id: 'e1', label: '장소 대여/피크닉존 예약비', amount: 30000, paidBy: '정하은' },
  { id: 'e2', label: '먹거리·음료', amount: 52000, paidBy: '김도윤' },
  { id: 'e3', label: '돗자리·용품 대여', amount: 18000, paidBy: '박지호' },
];

// [API 매핑] NOTIFICATIONS → notifications
// - text → message
// - icon: API에는 없음 — type 값을 기반으로 프론트에서 매핑
export const NOTIFICATIONS = [
  { id: 'n1', icon: 'check', text: '모임 일정이 토 오후 2시로 확정됐어요', time: '2시간 전' },
  { id: 'n2', icon: 'leaf', text: '먹거리 준비 역할, 2/3 진행 중', time: '어제' },
  { id: 'n3', icon: 'envelope', text: '박지호님이 초대장을 열람했어요', time: '2일 전' },
  { id: 'n4', icon: 'flower', text: '장소 후보에 새 의견이 등록됐어요', time: '3일 전' },
];

export const HISTORY = [
  { id: 'h1', name: '을지로 저녁 모임', date: '2026.05.16', members: 4 },
  { id: 'h2', name: '연남동 브런치', date: '2026.03.02', members: 6 },
];
