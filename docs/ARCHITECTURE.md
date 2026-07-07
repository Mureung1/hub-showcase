# Briefy 기술 설계

> 기획(문제·기능·시나리오)은 `docs/plan.md` 참조. 이 문서는 **여러 파일이 공유하는 기술 약속**만 담는다: 폴더 구조, 데이터 모델, 파서 계약.

## 1. 폴더 구조

```
briefy/
├── CLAUDE.md              # 프로젝트 규칙 (Claude Code가 매 세션 읽음)
├── docs/
│   ├── plan.md            # 기획서
│   ├── checklist.md       # 작업 체크리스트
│   └── ARCHITECTURE.md    # 이 문서
├── app/
│   ├── page.tsx           # 오늘 화면 (유일한 페이지, "use client")
│   ├── layout.tsx         # 모바일 뷰포트 레이아웃
│   └── api/
│       └── parse/route.ts # 파서 API (Claude API 호출, 서버 전용)
├── components/
│   ├── Header.tsx         # 로고 + 날짜
│   ├── ItemCard.tsx       # 체크박스 + 제목 + 메타 (+서브텍스트)
│   ├── Section.tsx        # 섹션 타이틀 + 카드 목록
│   ├── InputBar.tsx       # 하단 입력 바 (텍스트 + 🎤 + 전송)
│   ├── ClarifyCard.tsx    # 되묻기/후보 선택지 카드
│   └── Toast.tsx          # 저장/변경 확인 메시지
├── lib/
│   ├── storage.ts         # localStorage 유틸 (유일한 저장 경로)
│   ├── parse-client.ts    # /api/parse 호출 클라이언트 함수
│   └── prompts.ts         # 파서 시스템 프롬프트
└── types.ts               # 데이터 모델 (아래 §2)
```

원칙: 컴포넌트는 화면 조각, `lib/`는 로직, 데이터 모양은 `types.ts` 한 곳.

## 2. 데이터 모델 (`types.ts`)

날짜는 `YYYY-MM-DD`, 시간은 `HH:mm` (24시간) 문자열로 통일한다.

```typescript
export type ItemType = "event" | "task" | "memo" | "routine" | "meal";

interface BaseItem {
  id: string;              // crypto.randomUUID()
  type: ItemType;
  title: string;
  createdAt: string;       // ISO 문자열
}

/** 일정 — 날짜·시간이 있는 이벤트 (치과, 저녁 약속) */
export interface EventItem extends BaseItem {
  type: "event";
  date: string;            // YYYY-MM-DD
  time?: string;           // HH:mm
  reminderDate?: string;   // 리마인더 표시일 (예: 전날) YYYY-MM-DD
  done: boolean;
}

/** 과제(할 일) — 마감일이 있는 태스크 */
export interface TaskItem extends BaseItem {
  type: "task";
  deadline: string;        // YYYY-MM-DD
  done: boolean;
}

/** 메모 — 마감 없는 항목 */
export interface MemoItem extends BaseItem {
  type: "memo";
  done: boolean;
}

/** 루틴 — 요일 반복 (운동 A, 영어 공부) */
export interface RoutineItem extends BaseItem {
  type: "routine";
  days: number[];          // 0(일)~6(토), 예: 월수금 = [1,3,5]
  startTime?: string;      // HH:mm
  endTime?: string;        // HH:mm
  content?: string;        // "200 push-up, 300 squat"
  completedDates: string[]; // 완료한 날짜들 YYYY-MM-DD (오늘 포함 여부로 체크 상태 판단)
}

/** 식단 — 특정 날짜의 끼니 */
export interface MealItem extends BaseItem {
  type: "meal";
  date: string;            // YYYY-MM-DD
  slot: "breakfast" | "lunch" | "dinner";
  menu: string;            // "잡곡밥과 닭가슴살"
}

export type Item = EventItem | TaskItem | MemoItem | RoutineItem | MealItem;
```

오늘 화면의 각 섹션은 이 저장 데이터를 다음 규칙으로 필터한다:
- **오늘의 일정**: `event` 중 `date === 오늘`, 시간순
- **루틴**: `routine` 중 `days`에 오늘 요일 포함
- **오늘 식단**: `meal` 중 `date === 오늘`, 아침→점심→저녁 순
- **마감 임박 과제**: `task` 중 미완료, `deadline` 오름차순 상위 5개
- **메모**: `memo` 전체, 최신순

## 3. 파서 계약 (`POST /api/parse`)

### 요청

```json
{ "text": "다음주 화요일 오후 3시 치과, 전날 알려줘" }
```

서버는 시스템 프롬프트에 **오늘 날짜와 요일**을 주입한다 (상대 날짜 변환용).
수정·삭제·조회 판단을 위해 **현재 항목 목록의 요약**(id, type, title, 날짜)도 함께 주입한다.

### 응답 — intent에 따라 5가지 형태

**① 저장** (`save`) — 새 항목 생성. `item`은 §2 타입에서 `id`, `createdAt` 제외한 형태:

```json
{
  "intent": "save",
  "item": { "type": "event", "title": "치과", "date": "2026-07-14",
            "time": "15:00", "reminderDate": "2026-07-13" },
  "confirmMessage": "7월 14일 오후 3시 치과 일정으로 저장했어요. 전날 알려드릴게요."
}
```

**② 조회** (`query`) — 클라이언트가 필터를 실행:

```json
{
  "intent": "query",
  "filter": { "types": ["task"], "from": "2026-07-06", "to": "2026-07-12" },
  "emptyMessage": "이번 주 마감 항목이 없어요."
}
```

**③ 수정** (`update`) / **④ 삭제** (`delete`) — 대상은 주입된 목록의 id로 지목:

```json
{
  "intent": "update",
  "targetId": "abc-123",
  "changes": { "time": "16:00" },
  "confirmMessage": "치과를 오후 4시로 바꿨어요."
}
```

대상이 여러 개로 애매하면 `clarify`(⑤)로 후보를 반환한다.
완료 기록("오늘 운동 다 함")은 `update`로 처리: 루틴이면 `changes: { "completeToday": true }`.

**⑤ 되묻기** (`clarify`) — 모호하거나 정보 부족:

```json
{
  "intent": "clarify",
  "question": "\"운동\" — 어떤 의미인가요?",
  "options": [
    { "label": "오늘 운동 완료 기록", "resolvedText": "오늘 운동 루틴 완료했어" },
    { "label": "할 일 추가",        "resolvedText": "운동하기 할 일로 추가해줘" },
    { "label": "루틴 수정",         "resolvedText": "운동 루틴을 수정하고 싶어" }
  ]
}
```

`resolvedText` 방식: 버튼을 탭하면 그 문장을 파서에 다시 보낸다. 별도 확정 API가 필요 없어 파이프라인이 하나로 유지된다.

### 검증 규칙 (API Route에서 수행)

- 응답이 JSON이 아니거나 `intent`가 5가지 외 → 400 에러 (`{ "error": "..." }`)
- `save`의 `item.type`이 5개 타입 외, 필수 필드(날짜 등) 누락 → 에러
- 날짜가 `YYYY-MM-DD` 형식이 아니면 에러
- 에러 시 클라이언트는 토스트로 "다시 시도해주세요" 표시

### MVP 단계별 적용

- 2주차: `save` + `clarify`만 (프롬프트에서 나머지 intent 언급 안 함)
- 3주차: `query`, `update`, `delete` 추가 + 항목 목록 주입 시작
- 프롬프트 변경 시 기존 테스트 문장 회귀 확인 (checklist 참조)