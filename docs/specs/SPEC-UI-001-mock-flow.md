# SPEC-UI-001. Mock 기반 핵심 의사결정 프론트엔드 플로우

- 상태: **완료 (2026-07-18 — T-001~T-010 구현·QA, 개선 라운드 R1~R5 반영, 사용자 수동 확인 체크리스트 8항목 통과)**
- 기준 문서: `docs/domain-policy.md`, `docs/DESIGN.md`, `docs/design-skill.md`, `docs/data-model.md`
- 작성 방식:
  - 0장 "고정 사항"은 확정된 정책에서 온 것이며, 이 Spec에서 임의로 바꾸지 않는다. 바꾸려면 `docs/domain-policy.md`를 먼저 변경한다.
  - Step 1~11의 "결정 내용"은 **사용자가 직접 작성**한다. Agent는 대신 작성하지 않고, 질문과 선택지를 제시하고 결정을 받아 적는다.
  - 모든 Step이 `확정`되면 Spec 상태를 `Ready`로 바꾸고 구현(12장 Task)을 시작한다.

---

## 0. 고정 사항 (정책 확정)

### 0.1 한 줄 목표

이메일 인증이 완료된 Mock 사용자가 Chat에서 Question을 실행하고, 세 AI의 SourceAnswer와 Agenda를 검토하여 FinalAnswer와 DecisionNote를 생성한 뒤 다음 Question을 시작할 수 있다.

### 0.2 핵심 사용자 여정 (전부 Mock 데이터로 동작해야 함)

```text
Mock 인증 완료 사용자
→ 새 Chat과 첫 Question (제목 = 질문 앞 100자)
→ 세 AI(Claude·OpenAI·Gemini) 처리 상태 표시
→ AI별 구조화 답변 확인
→ Consensus Agenda 자동 passed (selectedContent 포함)
→ Conflict Agenda 사용자 판단
   ├ 기존 AI 내용 채택 (user_accepted)
   ├ 직접 입력 채택 (user_composed, 빈 값 불가)
   ├ 제외 (user_rejected)
   └ 재검토 1회 (recheck_requested → reanswered, 이후 재검토 버튼 없음)
→ 모든 Agenda passed/rejected 시 FinalAnswer 표시 (재생성 UI 없음)
→ DecisionNote 자동 요약 생성·저장 → Question completed
→ 다음 Question 활성화 (연속 질문)
→ Provider 실패 → 1회 재시도 → 재실패 시 '제외됨' 표시 후 계속 진행
```

### 0.3 제외 범위

- 실제 인증: Supabase 회원가입·로그인·이메일 인증·Session 복원·Protected Route (→ SPEC-AUTH-001~003)
- 실제 Backend: Express API, AI API, Manager AI, Prompt, 재시도 API, HTTP 오류 처리
- 실제 저장: localStorage, storageAdapter, Supabase, RLS, Migration
- 실제 데이터 계약: 최종 Zod Schema, `packages/shared`, DB 응답 검증
- 기타: Chat 삭제·제목 수정, DecisionNote 사용자 편집·수정·삭제, FinalAnswer 재생성, 모바일 완성, MD/Zip Export, Context Token 제한, **Context Preview UI(MVP 제외)**

### 0.4 상태 전이 (요약 — 원문은 domain-policy)

| 객체 | 상태 |
|---|---|
| Question | `draft → processing → review_required → completed` |
| SourceAnswer | `pending → processing → succeeded / failed` (재시도 1회, 재실패 시 excluded) |
| Agenda | `draft → passed(auto_consensus)` / `draft → conflicted → passed·rejected·recheck_requested → reanswered → passed·rejected` |

고정 규칙: Consensus도 `selectedContent`를 가진다 · FinalAnswer는 Question당 1회 · DecisionNote 자동 저장 후에만 `completed` · 한 Chat에 미완료 Question 1개.

### 0.5 Mock 시나리오

| 시나리오 | 목적 | 우선순위 |
|---|---|---|
| `happy-path` | Consensus 1 + Conflict 2 처리 후 정상 완료 | Must |
| `recheck-path` | 1회 재검토와 직접 입력 | Must |
| `provider-retry` | 첫 실패 → 재시도 성공 | Must |
| `provider-excluded` | 재시도 실패 → 해당 AI 제외 | Must |
| `all-rejected` | 고정 FinalAnswer 문구 표시 (`all_agendas_rejected`) | Must |
| `context-next-question` | 완료 Question 2개 상태에서 3번째 질문 시작 — 연속 질문 흐름과 기록 복원 확인 | Must |
| `single-source-fallback` | 1개 AI만 성공, "Consensus" 표현 금지 안내 | Should |
| `all-providers-failed` | 정책 미확정 (`docs/status.md`) — **완료 조건에서 제외** | Blocked |

시나리오 전환기는 실사용 UI에 넣지 않는다 (개발 전용: Query String `?scenario=...` 또는 Debug Panel — Step 11에서 결정).

### 0.6 Mock 데이터 임시 계약

아래 타입은 **임시 계약**이며 SPEC-SCHEMA-001(Zod)에서 확정 시 변경될 수 있다. 단, 최종 정책과 같은 필드명을 사용한다.

```ts
const mockUser = { id: "user-1", email: "demo@example.com", emailVerified: true };

type SourceAnswer = {
  id: string;
  provider: "claude" | "openai" | "gemini";
  status: "pending" | "processing" | "succeeded" | "failed";
  retryCount: 0 | 1;
  excludedFromComparison: boolean;
  sections: AnswerSection[];
};

type AnswerSection = { sectionId: string; title: string; content: string }; // sectionId 필수 (고정 요구사항)

type Agenda = {
  id: string;
  status: "draft" | "conflicted" | "recheck_requested" | "reanswered" | "passed" | "rejected";
  resolutionReason: null | "auto_consensus" | "user_accepted" | "user_accepted_after_recheck"
    | "user_composed" | "user_composed_after_recheck" | "user_rejected" | "user_rejected_after_recheck";
  title: string; summary: string;
  stances: { provider: string; text: string; sourceRefs: { sourceAnswerId: string; sectionId: string }[] }[];
  selectedContent: string | null;
  recheckResult: string | null;
};

type FinalAnswer = { content: string; generationMode: "multi_source" | "single_source_fallback" | "all_agendas_rejected" };
```

Mock 상태 변화는 Timer/Promise로 연출하되, 상태 전이 순서는 실제 정책과 동일해야 한다.

**모델 표시 라벨 규칙 (2026-07-16 확정)**: 내부 provider 값은 `claude` / `openai` / `gemini`를 유지하고, 화면 표시 라벨은 **Claude / ChatGPT / Gemini**를 사용한다.

### 0.7 디자인 적용

- Astryx 컴포넌트 우선, 색·간격은 `docs/DESIGN.md` 토큰 오버라이드 (`prototype/design-preview.html` 참고)
- 직접 제작 대상은 Agenda 카드, FinalAnswer 카드, Decision Note 카드뿐
- 3단 레이아웃 원칙과 상태 색 규칙은 DESIGN.md 5·7장을 따른다
- 페이지별 세부 배치·인터랙션은 아래 Step에서 결정한다 (문서 경계: DESIGN.md 8장)

---

## Step 작성 안내

각 Step은 다음 구조를 가진다. **"결정 내용"이 채워지고 상태가 `확정`이 되어야 해당 Step 완료다.**

- 목적 / 고정 제약(이미 결정됨) / 결정할 항목(질문) / ✍️ 결정 내용(사용자 작성) / 상태

| Step | 주제 | 상태 |
|---|---|---|
| 1 | 전체 레이아웃과 진입 상태 | 확정 |
| 2 | Chat 생성과 질문 입력 | 확정 |
| 3 | SourceAnswer 처리 상태 표시 | 확정 |
| 4 | AI 답변 확인 UI | 확정 |
| 5 | Agenda 표시 (Consensus·Conflict·카운터) | 확정 |
| 6 | Conflict 해소 인터랙션 | 확정 |
| 7 | FinalAnswer 표시 | 확정 |
| 8 | DecisionNote 자동 생성과 Question 완료 | 확정 |
| 9 | 다음 Question과 Context Preview | 확정 |
| 10 | 실패·재시도·제외 흐름 | 확정 |
| 11 | 시나리오 전환기와 Acceptance Criteria | 확정 |

---

## Step 1. 전체 레이아웃과 진입 상태

- 목적: Workspace의 뼈대와 첫 진입 화면을 확정한다.
- 고정 제약: 3단 레이아웃(Left Chat List / Center / Right Decision Notes), Mock 인증 완료 사용자로 시작, 회원가입·로그인 화면 없음.
- 결정할 항목:
  1. 중앙 영역 기본 구조 — v1(상단 고정 검색+충돌 섹션, `prototype.html`) vs v2(채팅형 컴포저+말풍선, `prototype_new.html`) 중 어느 쪽을 베이스로 할지, 혹은 혼합할지
  2. Mock 사용자(이메일)와 로그아웃 버튼 UI를 어디에 둘지 (헤더? 좌측 하단?)
  3. 첫 진입(Chat 없음) 빈 화면에 무엇을 보여줄지 (안내 문구, 예시 질문 등)
  4. 헤더(서비스명·태그라인) 유무와 내용
  5. Right 패널 하단 MD Zip 버튼 — 이번 Spec에선 동작 제외인데, 비활성으로 보여둘지 아예 숨길지
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **중앙 영역은 v2(채팅형) 베이스.** 하단 고정 컴포저(모델 뱃지 위 + 입력창·전송 아래), 트랜스크립트는 말풍선 형식(사용자 질문 오른쪽, 답변 카드 왼쪽). 충돌 지점은 답변 카드 내부에서 진행 (`prototype_new.html` 구조).
  2. **Mock 사용자 표시는 좌측 패널 하단.** 이메일(`demo@example.com`)과 로그아웃 버튼(UI만, 동작은 Mock)을 좌측 패널 최하단 고정 영역에 배치.
  3. **첫 진입(Chat 없음) 화면은 ChatGPT 스타일 중앙 정렬 빈 화면.**
     - 화면 세로 중앙에 인사 문구 1줄 (초안: "무엇을 결정해야 하나요?" — 문구는 반복 개선 라운드에서 조정)
     - 그 바로 아래 중앙에 컴포저(모델 뱃지 + 입력창 + 전송)
     - 그 아래 예시 질문 칩을 세로 리스트로 2~3개 표시, 클릭 시 입력창에 채워짐
     - 첫 질문 실행 시 컴포저가 하단 고정 위치로 이동하고 트랜스크립트가 시작됨
  4. **별도 상단 헤더 없음.** `prototype_new.html`처럼 좌측 패널 상단에 로고(● Decision Log)만 배치, 태그라인 생략.
  5. **MD Zip 다운로드 버튼은 오른쪽 패널 하단에 비활성(disabled) 상태로 항상 표시.** 이번 Spec에서 동작 없음.
- 상태: **확정**

## Step 2. Chat 생성과 질문 입력

- 목적: 질문 입력 → Chat·Question 생성 UX를 확정한다.
- 고정 제약: 빈 질문 실행 불가(1~1000자), Chat 제목 = 첫 질문 앞 100자, Chat과 Question은 별도 객체, 미완료 Question 존재 시 새 질문 불가, `draft → processing` 전이.
- 결정할 항목:
  1. Enter 전송 여부 (Enter 전송 + Shift+Enter 줄바꿈?)
  2. `draft` 상태를 UI에 노출할지 (입력 중 = draft로 볼지, 실행 순간 생성으로 볼지)
  3. [+ 새 채팅] 버튼 동작 (즉시 빈 Chat 화면? 질문 입력 후 생성?)
  4. Chat 목록 항목 표시 정보(제목만? 시간?)와 Chat 전환 시 동작
  5. 처리 중일 때 입력창·전송 버튼의 모습 (비활성? "충돌 해결 중" 라벨?)
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **Enter 전송 + Shift+Enter 줄바꿈** (v2 프로토타입 방식 유지). 전송 버튼 클릭도 동일 동작.
  2. **draft는 사용자에게 노출하지 않는다.** 전송 순간 Question을 `draft`로 생성하고 즉시 `processing`으로 전이한다. 입력 중 상태는 UI상 상태가 아니다.
  3. **[+ 새 채팅]은 Step 1의 빈 화면(중앙 컴포저)으로 전환.** 현재 Chat에 미완료 Question(`processing`/`review_required`)이 있으면 확인 팝업을 한 번 표시(초안: "진행 중인 질문이 있습니다. 새 채팅으로 이동할까요?") 후 확인 시 이동. 기존 Chat과 진행 상태는 그대로 유지된다.
  4. **Chat 목록은 제목만 표시**하되, 미완료 Question이 있는 Chat은 **제목 앞에 빨간 동그라미(●)** 를 표시한다. Chat 전환 시 해당 Chat의 트랜스크립트와 상태를 그대로 복원하고, **스크롤은 항상 맨 아래(최신)로 이동**한다(스크롤 위치 기억 안 함).
  5. **처리 중 입력창은 v2 프로토타입 방식.** 입력창 비활성 + 전송 버튼 라벨을 "충돌 해결 중"으로 변경.
  - 참고: 이번 Spec은 저장이 제외 범위이므로 Mock 데이터는 메모리에만 유지되고 새로고침 시 초기화된다.
- 상태: **확정**

## Step 3. SourceAnswer 처리 상태 표시

- 목적: `processing` 중 세 Provider의 상태를 보여주는 방식을 확정한다.
- 고정 제약: 상태 4종(pending/processing/succeeded/failed)이 순서대로 보여야 함, 기본 시나리오는 3개 모두 성공.
- 결정할 항목:
  1. 표시 형태 — 모델 뱃지 3개에 상태 아이콘? 별도 상태 카드 3장? 로딩 말풍선 안에 목록?
  2. 각 상태의 시각 표현 (스피너, 체크, 실패 아이콘 등)
  3. Mock 연출 시간 (예: Provider별 0.5~1.5초 순차 성공)
  4. 세 개가 끝나고 Agenda 화면으로 넘어가는 전환 연출
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **로딩 말풍선 방식(a안).** 답변 카드 자리에 로딩 말풍선이 뜨고, 그 안에 Claude·OpenAI·Gemini 3줄이 세로로 각자의 상태를 표시한다. 각 줄은 모델 식별 색 점 + 이름 + 상태 표시로 구성.
  2. **상태별 시각 표현**: `pending` = 회색 점, `processing` = 스피너, `succeeded` = 초록 체크(✓), `failed` = 빨간 ✕.
  3. **Mock 연출 시간**: 기본(happy-path) 시나리오에서 세 Provider가 0.6초 / 1.2초 / 1.8초에 순차 성공 (총 약 2초). 실패 시나리오의 타이밍은 Step 10에서 정의.
  4. **즉시 교체.** 세 Provider가 모두 최종 상태가 되면 중간 표시 없이 로딩 말풍선을 답변 카드(충돌 지점 포함)로 바로 교체한다.
- 상태: **확정**

## Step 4. AI 답변 확인 UI

- 목적: AI별 구조화 답변(SourceAnswer) 열람 방식을 확정한다.
- 고정 제약: Claude·OpenAI·Gemini 구분 명확, Section 단위 표시(각 Section은 sectionId 보유), 긴 답변 스크롤, 열기·닫기 가능.
- 결정할 항목:
  1. 열람 방식 — 프로토타입처럼 모달 팝업 + 탭? 인라인 아코디언? 우측 슬라이드?
  2. "AI 별 답변 보기" 버튼의 위치
  3. Section 구성 표시 방식 (요약/권장/주의 3단 유지? Mock에서 Section 제목 자유?)
  4. 제외된(excluded) Provider를 이 화면에서 어떻게 표시할지
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **대형 모달 + 3열 동시 표시.** "AI 별 답변 보기" 버튼 → 모달 팝업(화면의 90% 이상 크기). 탭 전환이 아니라 **Claude·OpenAI·Gemini 3개 답변을 3열로 한 번에 표시**하고, 각 열은 독립적으로 세로 스크롤된다. 열 상단에 모델 식별 색 점 + 모델명 헤더.
  2. **버튼 위치는 v2 프로토타입 그대로** — 답변 카드 상단 오른쪽.
  3. **표시는 전문(full text) 스타일.** Section 구분 라벨(요약/권장/주의) 없이 긴 답변 전문이 이어지는 형태로 보여준다. 단, **내부 Mock 데이터는 `sectionId`를 가진 Section 배열 구조를 유지**하고(고정 계약 — Agenda 근거 추적용) 렌더링 시 이어붙인다.
  4. **제외된 Provider는 해당 열 자리에 실패 안내 문구 + 에러 코드 표시.** (예: "OpenAI 답변을 불러오지 못해 비교에서 제외했습니다." + `PROVIDER_TIMEOUT` 형식의 Mock 에러 코드) 열 자체를 숨기지 않는다.
- 상태: **확정**

## Step 5. Agenda 표시

- 목적: Manager AI 결과(Agenda 목록)의 표시 방식을 확정한다.
- 고정 제약: 시나리오 기본 구성 Consensus ≥1 + Conflict ≥2, Consensus는 등장 즉시 `passed`(auto_consensus, selectedContent 표시), Conflict는 `conflicted`, Question은 `review_required`, 남은/전체 카운터.
- 결정할 항목:
  1. Consensus(자동 통과) Agenda를 사용자에게 보여줄지·어떻게 보여줄지 (초록 카드로 목록에? 접힌 "자동 통과 N건"?)
  2. Conflict 리스트의 위치 (중앙 상단 고정? 답변 카드 내부?)
  3. 카운터 `(남은/전체)` 위치와 0이 됐을 때 표현
  4. Agenda 카드에 노출할 정보 (제목, AI별 입장 한 줄 요약, 상태 pill, [해결] 버튼 — 프로토타입 유지 여부)
  5. 해소된 Agenda가 리스트에서 사라질 때의 처리 (제거 애니메이션? 완료 목록으로 이동?)
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **Consensus는 접힌 요약(b안).** 충돌 리스트 위나 아래에 "자동 통과 N건" 요약 한 줄을 두고, 클릭해 펼치면 각 Consensus Agenda의 제목과 `selectedContent`(합의 내용)를 확인할 수 있다. 목록 기본 상태는 접힘.
  2. **Conflict 리스트는 v2 프로토타입 그대로** — 답변 카드 상단에 "충돌 지점 (남은/전체)" 헤더 + 세로 리스트.
  3. **카운터 (0/N) 도달 시 프로토타입 방식 유지** — 카운터가 초록으로 바뀌고 "✓ 충돌 해결 완료" 뱃지로 교체.
  4. **Agenda 카드 정보는 프로토타입 그대로** — 제목 + AI별 입장 한 줄 요약 + "미해소" 뱃지 + [해결] 버튼. 추가 정보 없음.
  5. **해소된 Conflict는 제거 애니메이션 후 리스트에서 사라짐(a안, 프로토타입 방식).** 전체 이력은 남기지 않는다 (해소 결과는 FinalAnswer의 결정 사항 블록에서 확인).
- 상태: **확정**

## Step 6. Conflict 해소 인터랙션

- 목적: 4가지 판단 액션의 상세 UX를 확정한다.
- 고정 제약: 액션 4종(기존 AI 내용 채택 / 직접 입력 / 제외 / 재검토 1회), 직접 입력 빈 값 불가, `reanswered`에서는 채택·직접 입력·제외만(재검토 버튼 없음), resolutionReason 매핑은 0.4 참조.
- 결정할 항목:
  1. 해소 UI — 모달 팝업(프로토타입) vs 인라인 확장, 팝업이라면 배경 클릭 닫기 허용 여부
  2. "기존 AI 내용 채택"의 선택 방식 (AI 입장 카드 클릭 선택? 라디오? 각 입장 옆 [채택] 버튼?)
  3. 직접 입력 UI (팝업 내 textarea? 자리? placeholder 문구?)
  4. 재검토 요청 시 사용자가 요청 내용을 입력하는지(recheck_request), 아니면 버튼 한 번인지
  5. 재검토 로딩(recheck_requested)과 결과(reanswered)의 표현
  6. 해소 완료 후 확인 피드백 (토스트? 카드 상태 변화만?)
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **모달 팝업.** 배경 클릭과 우상단 × 두 방법으로 닫기 가능하며, 닫기만 하면 판단 보류(미해소 유지, 상태 변화 없음).
  2. **입장 카드 클릭 선택(b안).** AI별 입장 카드를 클릭하면 하이라이트로 선택 표시 → 하단 [채택] 버튼으로 확정. **[채택] 버튼은 처음엔 비활성**이고, 안내 메시지 "하나를 선택하거나 직접 채택할 답변을 입력하세요"를 표시한다. 카드를 선택하면 활성화.
  3. **직접 입력은 프로토타입 방식.** [내 결정] → 팝업 안 textarea 확장 + [결정 반영]/[뒤로] 버튼. placeholder: "이 충돌에 대한 나의 결정을 입력하세요". 빈 값은 반영 불가(포커스 유지).
  4. **재검토는 요청 내용 입력 후 시작(b안).** [재검토] 클릭 시 한 줄 입력창이 열리고 사용자가 재검토 요청 내용(`recheck_request`)을 입력한 뒤 시작한다. 빈 값으로는 시작 불가.
  5. **재검토 로딩·결과는 프로토타입 방식 유지.** "Manager AI가 재검색 중…" 스피너 → 파란 결과 박스(`recheckResult`), 이후 버튼은 [이 결과로 결정] / [내용 제외] / [내 결정] 3개로 교체. 재검토 버튼은 다시 표시하지 않는다(고정 정책).
  6. **해소 완료 시 토스트 표시.** 액션별 문구 초안: 채택·직접 입력·재검토 결정 → "Agenda가 채택되었습니다", 제외 → "Agenda를 최종 답변에서 제외했습니다". (문구는 반복 개선 라운드에서 조정 가능)
- ✍️ 개정 (2026-07-16 Round 1):
  1. **팝업 대형화**: 충돌 해소 팝업을 크게 키운다. 각 AI 입장 카드는 **기본 5줄 분량**이 보이도록 하고, 내용이 더 길면 카드 내 스크롤 또는 팝업 확장으로 전체를 읽을 수 있게 한다. Mock stance 텍스트도 5줄 이상 분량으로 보강한다(한 줄 요약 금지 — 판단 근거가 되도록).
  2. **하단 액션 버튼 사이 간격 확보** (style 등급이지만 팝업 개편과 함께 진행).
  3. **재검토 요청 내용은 필수 → 선택 입력으로 변경.** [재검토] 클릭 시 입력창의 안내는 "추가 의견이 있으면 입력하세요 (선택)"이고, **빈 값으로도 재검토를 시작할 수 있다.** 재질문의 의미는 "각 AI의 Agenda별 입장(stances)을 담아 Manager AI에게 재질문"하는 것이며, 사용자가 입력한 추가 의견(`recheckRequest`)은 있을 때만 함께 전달한다. (domain-policy의 `recheck_request`는 nullable이므로 정책 정합)
- ✍️ 개정 (2026-07-16 Round 2):
  1. **팝업 높이를 현재의 2배 수준으로 확대** (내용이 부족하면 max-height 기준).
  2. **AI 입장 카드 3장을 세로 스택 → 가로 3열 배치.** 각 열은 모델 색 점+라벨 헤더 + 본문, 내용이 길면 열 내부 세로 스크롤.
  3. **stance 본문은 보조 색(muted)이 아니라 기본 텍스트 색을 사용한다.** 판단 근거가 되는 본문은 명확하게 보여야 한다.
  4. **재검토 진행 중·완료 후에도 입장 카드를 흐리게(백화·투명도) 처리하지 않는다.** 텍스트는 항상 명확하게 유지하고, 재검토 결과 박스만 아래에 추가된다.
- ✍️ 개정 (2026-07-17 Round 3):
  1. **하단 액션 버튼 영역 고정 + 본문만 스크롤.** 팝업을 [본문 영역(스크롤 가능)] + [하단 버튼 영역(고정)] 2단 구조로 나눈다. 재검토 결과(`recheckResult`)처럼 본문이 길어져도 버튼 영역은 항상 팝업 하단에 보이고, 스크롤은 본문 영역 안에서만 일어난다. 팝업 크기·3열 배치 등 기존 R1·R2 결정은 유지.
- ✍️ 개정 (2026-07-17 Round 5):
  1. **토스트는 2초 후 자동 소멸.** 해소 완료 토스트(결정 내용 6)를 포함한 모든 토스트는 표시 후 약 2초가 지나면 자동으로 사라진다. 수동 닫기 버튼이 있어도 자동 소멸은 동일하게 동작한다.
- 상태: **확정 (R1·R2·R3·R5 개정 반영)**

## Step 7. FinalAnswer 표시

- 목적: 최종 답변 카드의 구성을 확정한다.
- 고정 제약: 모든 Agenda 최종 처리 시 자동 표시, 재생성 버튼 금지, `all_agendas_rejected`면 고정 문구 "모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다.", single_source_fallback이면 일부 제외 안내(합의로 표현 금지), 표시 후에도 Question은 `review_required` 유지.
- 결정할 항목:
  1. 카드 구성 — v2 프로토타입의 [질문 재표시 / 도입부 / 공통 권장 / 결정 사항 / 제외 항목 / 출처] 블록을 유지할지, 조정할지
  2. rejected Agenda의 제외 사실 표시 방식
  3. all-rejected 화면의 구성 (문구만? 다시 질문 유도 버튼?)
  4. generation_mode별 안내 문구(단일 소스 fallback 등)의 위치와 문구
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **카드 블록 순서 재정의**: [✓ 충돌 해결 완료 뱃지] → [공통 권장 사항] → [결정 사항(사용자 판단 우선, 초록 박스)] → [제외한 항목] → **[최종 답변 본문]** → [출처 AI].
     - **최종 답변 본문은 요약이 아니라 상세한 완전 답변이다.** 사용자의 원래 질문에 대해, Consensus Agenda와 해결된 Conflict Agenda의 `selectedContent`를 근거로 다시 정리한 긴 답변 전문을 표시한다. Mock 데이터의 `FinalAnswer.content`도 충분히 긴 본문으로 준비한다.
     - v2 프로토타입의 "도입부(요약)" 블록은 이 상세 본문으로 대체된다. 질문 재표시는 하지 않는다(트랜스크립트의 사용자 말풍선이 위에 있음).
  2. **제외 표시는 프로토타입 그대로** — 하단에 "최종 답변에서 제외한 항목: ○○" 한 줄. 사유는 표시하지 않는다.
  3. **all-rejected는 고정 문구만 표시** — FinalAnswer 카드 자리에 "모든 Agenda가 충돌하였습니다. 다시 질문 부탁드립니다." 문구만. 유도 버튼 없음.
  4. **single_source_fallback 안내는 카드 하단 각주** — "일부 AI 답변을 불러오지 못해 하나의 답변만을 기반으로 결과를 생성했습니다." (합의/Consensus 표현 금지 — 고정 정책)
- ✍️ 개정 (2026-07-16 Round 1):
  1. **FinalAnswer 표시 후에는 별도의 "자동 통과 N건" 접힘 요약을 없앤다.** (충돌 해소 진행 중에는 기존대로 유지)
  2. **[공통 권장 사항] 섹션 = 헤딩 + 왼쪽 펼치기 토글.** 펼치면 자동 통과 Agenda의 제목과 합의 내용(selectedContent)을 확인할 수 있다. 기본값 접힘.
  3. **[결정 사항] 섹션도 같은 방식의 접기/펼치기**로 하고, **기본값 접힘**. (펼치면 사용자 판단 Agenda 제목 + selectedContent 초록 박스)
  4. 결과적으로 FinalAnswer 카드의 기본 화면은 [✓ 뱃지 → 공통 권장 사항(접힘 헤딩) → 결정 사항(접힘 헤딩) → 제외 항목 한 줄 → 최종 답변 본문 → 출처]로, 상세 본문이 중심이 된다.
- 상태: **확정 (R1 개정 반영)**

## Step 8. DecisionNote 자동 생성과 Question 완료

- 목적: DecisionNote 자동 생성·저장과 Question 완료 전환의 UX를 확정한다.
- 고정 제약 (2026-07-16 정책 변경 반영): DecisionNote는 FinalAnswer 확정 직후 **자동 요약으로 생성·저장**되며(사용자 입력 없음), 저장 완료 후 Question이 `completed`가 되고 다음 질문 입력이 활성화된다. 사용자 편집·수정·삭제는 후속 버전. (`docs/domain-policy.md` 6장)
- 결정할 항목:
  1. 자동 생성 연출 — FinalAnswer 표시 직후 (a) 즉시 오른쪽 패널에 노트 카드 추가 vs (b) "요약 생성 중…" 짧은 연출 후 추가
  2. 노트 카드 형식 — v2 프로토타입([최종 결론 #N] 뱃지 + 제목 + 개조식 bullet + 출처 AI) 유지 여부
  3. 완료 피드백 — Question 자동 completed + 입력창 재활성화를 사용자에게 알릴 방법 (토스트? 조용히?)
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **DecisionNote는 자동 요약 생성·저장으로 확정.** 사용자 작성 UI를 만들지 않는다. 편집 기능은 후속 버전에서 추가 예정. (`docs/domain-policy.md` 6장 반영 완료)
  2. **즉시 추가(a안).** FinalAnswer 표시 직후 별도 연출 없이 오른쪽 Decision Notes 패널에 노트 카드가 바로 추가된다.
  3. **노트 카드 형식은 v2 프로토타입 그대로** — [최종 결론 #N] 뱃지 + 제목 + 개조식 bullet + 출처 AI. 최신 노트가 위로 오도록 역순 표시.
  4. **완료 전환은 조용히.** 토스트 없이 Question이 `completed`로 바뀌고 입력창·전송 버튼이 재활성화된다. Chat 목록의 빨간 동그라미도 이때 사라진다.
- ✍️ 개정 (2026-07-16 Round 1):
  1. **노트 카드 간소화**: [최종 결론 #N] 뱃지와 출처 AI 표시를 삭제한다. 카드는 제목 + 개조식 요약만.
  2. **카드 크기 제한**: 한 화면(우측 패널)에 노트 4~5개가 보이도록 카드 최대 높이를 제한하고, 넘치는 내용은 말줄임 처리한다. 노트가 많아지면 패널이 세로 스크롤된다.
  3. **노트는 활성 Chat 기준으로 표시한다.** 새 Chat(빈 화면)에서는 노트 패널이 빈 상태이고, Chat을 전환하면 해당 Chat의 노트만 보인다. (기존 전역 누적은 프로토타입 유산 — domain-policy상 DecisionNote는 Question→Chat 소속이므로 이 변경이 정책에 정합. 데이터는 Chat별 연결로 보관하고 표시만 활성 Chat 필터)
- ✍️ 개정 (2026-07-17 Round 3):
  1. **노트 내용은 개조식 문장으로 한정한다.** 서술형 문단 금지, 항목 나열(bullet)만 사용. 항목 수 제한은 없다. Mock 데이터의 노트 `content`를 전부 개조식으로 교체한다. 이 형식 규칙은 추후 DecisionNote 자동 생성 Prompt(관련 AI Spec)에도 그대로 적용한다.
  2. **노트 → Question 이동 버튼.** 노트 카드 우상단에 작은 아이콘 버튼(↗)을 두고, 클릭하면 중앙 트랜스크립트에서 매핑된 Question 블록으로 부드럽게 스크롤한 뒤 해당 블록을 약 1.5초 하이라이트한다. 노트는 활성 Chat 기준으로 표시되므로 대상 Question은 항상 현재 트랜스크립트에 렌더링되어 있다.
- ✍️ 개정 (2026-07-17 Round 4):
  1. **노트 정렬을 시간순(최신이 아래)으로 변경.** 결정 내용 3의 "최신 노트가 위로 오도록 역순 표시"를 대체한다. 노트는 Question 순서 그대로 위→아래로 쌓인다 (중앙 트랜스크립트와 같은 방향).
  2. **패널 스크롤은 최하단 유지.** 노트가 패널 높이를 넘으면(대략 4개 이상) 새 노트 추가 시와 Chat 진입·전환 시 패널 스크롤을 자동으로 가장 아래로 내려 최신 노트가 보이게 한다. 사용자가 직접 위로 스크롤해 이전 노트를 읽는 것은 방해하지 않는다.
- ✍️ 개정 (2026-07-17 Round 5):
  1. **Question이 `completed`로 전환되면 중앙 트랜스크립트 스크롤을 최하단으로 이동한다.** DecisionNote 저장 → completed 전환 직후 부드럽게 맨 아래로 내려, FinalAnswer 하단과 재활성화된 질문 입력창이 바로 보이게 한다. 이동은 completed 전환 시점 1회만 수행하며, 이후 사용자의 수동 스크롤은 방해하지 않는다.
- 상태: **확정 (R1·R3·R4·R5 개정 반영)**

## Step 9. 다음 Question과 Context Preview

- 목적: 연속 질문과 Context 표시를 확정한다.
- 고정 제약: 직전 completed Question → FinalAnswer, 그 이전 → DecisionNote (실제 Prompt 생성은 후속 Spec), `context-next-question` fixture는 완료 Question 2개 상태에서 시작.
- 결정할 항목:
  1. Context Preview의 위치 (질문 입력창 위? 접이식 패널? 실행 직후 표시?)
  2. Preview에 보여줄 정보 수준 (참고자료 예시 형식 그대로? 제목만? 펼치면 전문?)
  3. 항상 표시할지, 두 번째 질문부터만 표시할지
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **MVP에서는 Context Preview를 화면에 표시하지 않는다.** Context 구성 정책(직전 → FinalAnswer, 그 이전 → DecisionNote)은 domain-policy 그대로 유효하며, 실제 사용은 AI Prompt Spec(백엔드 연결) 단계에서 구현한다. Preview UI는 후속 버전 후보.
  2. 이에 따라 이번 Spec에서 Step 9의 화면 요소는 **"완료 후 다음 질문 입력이 활성화되고 연속 질문이 가능하다"** 만 검증한다. `context-next-question` 시나리오의 목적도 연속 질문 흐름·기록 복원 확인으로 조정 (0.5 반영).
- 상태: **확정**

## Step 10. 실패·재시도·제외 흐름

- 목적: Provider 실패 관련 UX를 확정한다.
- 고정 제약: 첫 실패 → 재시도 1회(자동인지 수동 Retry 버튼인지는 아래에서 결정) → 재실패 시 `excluded` 표시 후 성공한 답변으로 계속, 제외 카드는 숨기지 않고 "제외됨"으로 남김, 안내 문구 예: "OpenAI 답변을 불러오지 못해 비교에서 제외했습니다."
- 결정할 항목:
  1. 재시도 방식 — 자동 재시도(정책 원문에 가까움) vs 사용자가 누르는 Retry 버튼 (참고자료는 버튼 제안) → **택 1 필요**
  2. 실패·재시도 중·제외됨 상태의 카드 표현
  3. 제외 안내를 어디에 보여줄지 (카드 내? 상단 배너? 토스트?)
  4. single-source-fallback 안내 문구와 위치
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **자동 재시도(a안).** Provider 실패 시 사용자 개입 없이 자동으로 1회 재시도하고, 재실패 시 비교에서 제외한다 (domain-policy 원문에 충실). 수동 [재시도] 버튼은 만들지 않는다.
  2. **상태 카드 표현**: 실패 = 빨간 ✕ → 자동 재시도 중 = "재시도 중…" 라벨 + 스피너 → 최종 제외 = "제외됨" 회색 처리. Step 3의 로딩 말풍선 3줄 안에서 표현하고, 제외된 줄은 회색으로 남긴다(숨기지 않음).
  3. **제외 안내는 답변 카드 상단 배너(a안).** "OpenAI 답변을 불러오지 못해 비교에서 제외했습니다." 형식으로 답변 카드 상단에 고정 표시. 토스트는 사용하지 않는다.
  4. **single-source-fallback 안내는 FinalAnswer 하단 각주만으로 충분** (Step 7 결정 유지). Agenda 단계에서는 2·3번의 제외 표시 외 별도 안내 없음.
  - Mock 연출: `provider-retry` 시나리오는 실패(0.8초) → 자동 재시도(1.5초) → 성공, `provider-excluded`는 실패 → 재시도 → 재실패(총 ~2.5초) → 제외 배너 표시 후 성공한 2개로 계속 진행.
- 상태: **확정**

## Step 11. 시나리오 전환기와 Acceptance Criteria

- 목적: 개발용 시나리오 전환 방법을 정하고, Step 1~10 결정을 바탕으로 AC를 확정한다.
- 고정 제약: 전환기는 실사용 UI에 노출 금지. AC는 0.5의 Must 시나리오 6종이 모두 브라우저에서 통과해야 한다.
- 결정할 항목:
  1. 전환 방식 — Query String / 개발 전용 상수 / Debug Panel 중 택 1
  2. AC 목록 확정 (Step 결정이 끝난 뒤 Agent가 초안을 만들고 사용자가 승인)
- ✍️ 결정 내용 (2026-07-16 확정):
  1. **시나리오 전환은 Query String 방식.** 예: `?scenario=provider-excluded`. 파라미터가 없으면 `happy-path`. 실사용 UI에는 노출하지 않으며, 실제 백엔드 연결 시 제거한다.
  2. **all-rejected 시 DecisionNote 처리(a안)**: 고정 문구 FinalAnswer를 그대로 DecisionNote로 저장하고 Question을 `completed` 처리한다 (`docs/domain-policy.md` 6장 반영).
  3. **Acceptance Criteria 확정** (아래 전체 목록, 사용자 승인 완료):

  **AC-1. happy-path (기본 완주)**
  1. 빈 화면(중앙 인사 문구+컴포저)에서 질문 전송 → 새 Chat 생성, 좌측 목록에 제목(질문 앞 100자) + ● 표시
  2. 컴포저가 하단으로 이동, 입력창 비활성 + 전송 버튼 "충돌 해결 중"
  3. 로딩 말풍선에서 3 Provider가 회색 점 → 스피너 → 초록 체크로 순차 성공(0.6/1.2/1.8초)
  4. 답변 카드로 즉시 교체: 충돌 지점 (2/2) 리스트 + "자동 통과 1건" 접힘 요약(펼치면 selectedContent)
  5. 충돌 1건은 입장 카드 선택→[채택], 1건은 [내 결정] 직접 입력으로 해소 — 각각 토스트, 리스트 제거 애니메이션, 카운터 감소
  6. (0/2) 도달 → "✓ 충돌 해결 완료" → FinalAnswer 카드: 공통 권장 → 결정 사항 → 제외 항목 → 상세 본문(요약 아님) → 출처
  7. 오른쪽 패널에 노트([최종 결론 #N]+제목+개조식+출처) 즉시 추가, 입력창 조용히 재활성, ● 사라짐

  **AC-2. recheck-path (재검토)**
  1. 충돌 팝업에서 [재검토] → 요청 내용 입력(빈 값 불가) → "재검색 중…" 스피너 → 파란 결과 박스
  2. 버튼이 [이 결과로 결정]/[내용 제외]/[내 결정]으로 교체, 재검토 버튼 재표시 안 됨
  3. [이 결과로 결정] 시 passed 처리되어 FinalAnswer 결정 사항에 반영

  **AC-3. provider-retry (재시도 성공)**
  1. 한 Provider가 빨간 ✕ → 자동 "재시도 중…" 스피너 → 초록 체크
  2. 이후 3개 답변 기준으로 정상 진행

  **AC-4. provider-excluded (제외)**
  1. 재시도 후에도 실패 → 로딩 줄이 "제외됨" 회색으로 남음(숨기지 않음)
  2. 답변 카드 상단에 제외 배너 고정 ("○○ 답변을 불러오지 못해 비교에서 제외했습니다")
  3. 답변 팝업(3열)의 해당 열에 실패 안내 문구 + 에러 코드 표시, 성공한 2개로 흐름 계속

  **AC-5. all-rejected (전부 제외)**
  1. 충돌 전부 [내용 제외] → FinalAnswer 자리에 고정 문구만 표시(유도 버튼·재생성 없음)
  2. 고정 문구가 그대로 DecisionNote로 저장되고 Question은 completed, 다음 질문 입력 활성화

  **AC-6. context-next-question (연속 질문)**
  1. 완료 Question 2개가 있는 Chat fixture에서 3번째 질문 시작 가능
  2. Chat 전환 시 트랜스크립트·상태 완전 복원 + 스크롤 맨 아래, 미완료 Chat은 ● 표시

  **AC-7. 공통**
  1. 팝업 3종(답변 3열 대형·충돌 해소·새 채팅 경고)이 배경 클릭/× 로 닫히고, 닫기 = 판단 보류
  2. [채택] 버튼 초기 비활성 + 안내 문구 "하나를 선택하거나 직접 채택할 답변을 입력하세요"
  3. 직접 입력·재검토 요청은 빈 값 불가
  4. Astryx 컴포넌트·DESIGN.md 토큰 사용, `docs/design-skill.md` 체크리스트 통과
  5. `npm run typecheck / lint / build` 통과, 시나리오 전환기 실사용 UI 비노출
- 상태: **확정**

---

## 12. 구현 Task 분해 (Spec 확정 후 진행)

하나의 Task로 구현하지 않는다. Task 단위로 커밋하고, 각 Task 종료 시 브라우저에서 해당 구간을 확인한다.

```text
T-001 기본 Workspace·Chat·Question UI (Step 1·2)
T-002 Question·SourceAnswer 상태 흐름 (Step 3)
T-003 AI Answers 카드와 열람 UI (Step 4)
T-004 Agenda 카드와 상태 전이 (Step 5)
T-005 재검토·직접 입력·제외 흐름 (Step 6)
T-006 FinalAnswer와 all-rejected 흐름 (Step 7)
T-007 DecisionNote 저장과 Question 완료 (Step 8)
T-008 다음 Question과 Context Preview (Step 9)
T-009 실패·재시도·제외 시나리오 (Step 10)
T-010 전체 흐름 QA와 화면 정리 (Step 11 AC 검증, qa-reviewer 호출)
```

## 13. UI 반복 개선 프로세스

UI는 한 번에 확정되지 않는다는 전제로, 수정 절차를 다음과 같이 고정한다.

1. **수정 등급 규칙 (2026-07-16 개정)**:
   - **바로 수정 가능(문서 수정 불필요)**: Step 결정 내용과 충돌하지 않는 시각적 다듬기 — 간격·정렬·크기 미세 조정, 줄바꿈·ellipsis, hover·애니메이션 타이밍 등. 단 `docs/DESIGN.md` 3장 적용 원칙(Astryx 컴포넌트 우선, 색·간격은 토큰, fork 금지)을 지키고 `style:` 커밋으로 남긴다.
   - **토큰 수정**: 색·간격 값 자체를 바꾸려면 코드에 하드코딩하지 않고 `docs/DESIGN.md` 토큰 표를 고친다.
   - **Spec-first 수정**: 배치 구조, 요소 추가·제거, 인터랙션·상태·정책성 문구 변경은 이 문서의 해당 Step "결정 내용"을 먼저 고친 뒤 구현한다. (문서와 화면이 어긋난 채 커밋하지 않는다)
   - 어느 등급인지 애매하면 Spec-first로 취급한다.
2. **라운드 단위 피드백**: 구현 확인 후 피드백은 한 라운드에 **최대 3개**로 정리한다. 가장 중요한 사용성 문제부터 반영하고, 반영 후 `docs/design-skill.md` 체크리스트로 다시 점검한다.
3. **개정 기록**: 모든 라운드는 아래 표에 남긴다. 어떤 Step이 왜 바뀌었는지 추적 가능해야 한다.

| Round | 날짜 | 대상 Step | 변경 요약 | 반영 Task/Commit |
|---|---|---|---|---|
| R1 | 2026-07-16 | Step 6·7·8 | QA 수동 체크 결과: 충돌 팝업 대형화·stance 5줄·재검토 옵션화 / FinalAnswer 공통 권장·결정 사항 접이식(기본 접힘)·자동 통과 요약 통합 / 노트 카드 간소화·크기 제한·Chat별 표시 | 반영 완료 — `refactor: 라운드 1 — 팝업 대형화·FinalAnswer 접이식·노트 패널 개편` (2026-07-17) |
| R2 | 2026-07-16 | Step 6 + style | 충돌 팝업: 높이 2배·입장 카드 가로 3열·본문 기본 텍스트 색·재검토 시 흐림 제거 / AI 별 답변 보기 버튼 테두리 상시 표시 | 반영 완료 — `refactor: 라운드 2 — 충돌 팝업 가로 3열·텍스트 명확화·답변 보기 버튼 테두리` (2026-07-17) |
| R3 | 2026-07-17 | Step 6·8 | 충돌 팝업: 하단 버튼 고정+본문만 스크롤 / 노트: 내용 개조식 한정(Mock 교체, 항목 수 제한 없음) / 노트 카드 우상단 ↗ 버튼 → 매핑 Question으로 스크롤+1.5초 하이라이트 | 반영 완료 — `refactor: 라운드 3 — 팝업 본문 스크롤·노트 개조식·질문 이동 버튼` (2026-07-17) |
| R4 | 2026-07-17 | Step 8 | 노트 정렬 시간순(최신 아래)으로 변경 + 패널 스크롤 최하단 자동 유지(새 노트 추가·Chat 전환 시) | 반영 완료 — `refactor: 라운드 4 — 노트 시간순 정렬·패널 스크롤 하단 유지` (2026-07-17) |
| R5 | 2026-07-17 | Step 6·8 | 토스트 2초 후 자동 소멸 / Question completed 전환 시 중앙 트랜스크립트 스크롤 최하단 이동(1회, 수동 스크롤 불간섭) | 반영 완료 — `refactor: 라운드 5 — 토스트 자동 소멸·완료 시 트랜스크립트 하단 이동` (2026-07-18) |

4. **충돌 처리**: 구현이 Spec과 다르거나 Spec끼리 모순이면 임의로 결정하지 않고 충돌 내용을 보고한다 (CLAUDE.md 3장).
5. **디자인 토큰 변경**: 색·간격 관련 피드백은 이 Spec이 아니라 `docs/DESIGN.md` 토큰 값 수정으로 처리하고, `prototype/design-preview.html`로 먼저 확인한다.

## 14. Spec 완료 조건

- Step 1~11이 모두 `확정` 상태다.
- Must 시나리오 6종이 브라우저에서 통과한다 (AC는 Step 11에서 확정).
- `npm run typecheck`, `npm run lint`, `npm run build` 통과.
- qa-reviewer 검토에서 BLOCKER/MAJOR 없음.
- `docs/status.md` 갱신.
