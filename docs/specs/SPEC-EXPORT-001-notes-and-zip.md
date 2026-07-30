# SPEC-EXPORT-001. DecisionNote MD Export

- 상태: **작성 완료 (사용자 확인 대기)**
- 기준 문서: `docs/product.md`(Epic 4), `docs/domain-policy.md`(6·7장), `docs/data-model.md`(3.7), `CLAUDE.md` 2·7장
- 범위: **Epic 4의 Story 4-3·4-4.** 4-1·4-2(확인·리스트)는 `DecisionNotesPanel`로 이미 구현돼 있다.

---

## 0. 고정 사항

### 0.1 한 줄 목표

사용자가 저장된 **DecisionNote를 개별 MD 파일로 묶은 Zip**과 **전체 대화 MD 한 장**을 내려받을 수 있게 한다.

### 0.2 이 Spec이 유난히 짧은 이유

**서버 작업이 없다.**

- 데이터는 이미 API로 조회된다 — `DecisionNotesPanel`이 훅의 `decisionNotes`를 받고 있다
- MD 생성은 문자열 조립이다
- Zip은 JSZip(브라우저 라이브러리)이 만든다
- 다운로드는 Blob + `<a download>`

**새 엔드포인트도, 마이그레이션도, AI 호출도 없다.**

### 0.3 기존 문서에서 오는 규칙

| 규칙 | 근거 |
|---|---|
| DecisionNote는 Question당 정확히 하나 | `domain-policy` §6 |
| DecisionNote는 `question_id`만 저장한다 (`chat_id` 없음) | §6 · `data-model` 3.7 |
| 사용자 편집·삭제 기능 없음 | §6·§7 |
| 프론트엔드는 `fetch`를 직접 호출하지 않는다 → apiClient → adapter → Hook | `CLAUDE.md` 7장 |
| Export 도구는 Markdown Generator + JSZip | `CLAUDE.md` 2장 |

### 0.4 제외 범위

| 항목 | 이유 |
|---|---|
| PDF·DOCX 등 다른 형식 | Epic 4가 MD로 한정 |
| 서버 측 Export API | 클라이언트에서 전부 된다 |
| 3사 원문·Agenda 전문 포함 | §3.2 — 선택 확장으로 남긴다 |
| Export 이력 저장 | 요구 없음 |

---

## 1. 두 가지 산출물

| Story | 산출물 | 단위 |
|---|---|---|
| **4-3** | DecisionNote 개별 MD들을 묶은 **Zip** | Chat 하나 |
| **4-4** | 전체 대화 **MD 한 장** | Chat 하나 |

**둘 다 Chat 단위다.** 사용자가 보고 있는 Chat의 것을 내려받는다. 여러 Chat을 한 번에 묶는 기능은 요구에 없다.

---

## 2. Story 4-3 — DecisionNote Zip

### 2.1 파일 구조

```text
decision-log_{chat제목}_{YYYYMMDD}.zip
├── 01_{질문요약}.md
├── 02_{질문요약}.md
└── ...
```

- **번호는 Question 순서**(`sequence`)를 따른다. 정렬이 흔들리면 안 된다
- `{질문요약}`은 `Question.message` 앞부분을 잘라 쓴다 (§2.3)
- DecisionNote가 없는 Question은 **건너뛴다.** 빈 파일을 만들지 않는다

### 2.2 개별 MD 형식

```markdown
# {Question.message}

- 작성일: {DecisionNote.createdAt}
- Chat: {Chat.title}

---

{DecisionNote.content}
```

**본문은 그대로 넣는다.** SPEC-AI-003 T-020.3에서 마크다운을 금지했으므로 평문 문단이고, MD 파일에서 문단으로 잘 보인다.

### 2.3 파일명 규칙

파일명은 OS·압축 도구가 거부하지 않아야 한다.

```text
1. Question.message 앞 30자를 취한다
2. 파일명에 쓸 수 없는 문자를 제거한다  \ / : * ? " < > | 및 제어문자
3. 연속 공백을 하나로, 앞뒤 공백 제거
4. 결과가 비면 "question" 으로 대체한다
5. 같은 이름이 겹치면 뒤에 -2, -3 을 붙인다
```

**5번을 빠뜨리면 Zip에서 파일이 덮어써진다.** 질문 앞 30자가 같은 경우가 실제로 생긴다.

---

## 3. Story 4-4 — 전체 대화 MD

### 3.1 파일 구조

```text
decision-log_{chat제목}_{YYYYMMDD}_전체.md
```

한 장짜리 파일이다.

### 3.2 담을 것 — 최소안

```markdown
# {Chat.title}

- 내보낸 날짜: {오늘}
- 질문 수: {N}

---

## 1. {Question.message}

### 최종 답변

{FinalAnswer.content}

### 결정 기록

{DecisionNote.content}

---

## 2. ...
```

**3사 원문과 Agenda는 넣지 않는다.** 파일이 몇 배로 커지고, 사용자가 내려받는 목적은 "결정 기록"이지 "원본 자료"가 아니다.

⚠️ 필요하다고 판단되면 확장할 수 있으나 **이번 범위는 최소안**이다. Epic 4-4의 문구가 "전체 대화 내용"이라 해석 여지가 있는데, **DecisionNote가 없는 Question은 아직 결론이 없는 것**이므로 결정 기록 관점에서는 담을 게 없다.

### 3.3 미완료 Question 처리

`completed`가 아닌 Question은 FinalAnswer·DecisionNote가 없다.

```text
건너뛰지 말고 제목만 남긴다 — "아직 진행 중입니다"
```

**건너뛰면 번호가 어긋난다.** 화면의 순서와 파일의 순서가 달라지면 사용자가 혼란스럽다.

---

## 4. 화면 배선

### 4.1 버튼 위치

`DecisionNotesPanel`(우측 패널)에 둘을 둔다.

```text
[결정 기록 Zip 받기]   → Story 4-3
[전체 대화 MD 받기]    → Story 4-4
```

### 4.2 비활성 조건

**내려받을 것이 없으면 버튼을 비활성한다.**

| 버튼 | 비활성 조건 |
|---|---|
| Zip | DecisionNote가 0건 |
| 전체 MD | Question이 0건 |

⚠️ **상태로 분기하지 마라.** `chat.status` 같은 것이 아니라 **"내려받을 데이터가 있는가"**로 판단한다. SPEC-AI-002 T-019.5·T-019.6에서 상태 기반 가드가 새 경로를 막은 사례가 두 번 있었다.

### 4.3 계층

`CLAUDE.md` 7장을 지킨다.

```text
컴포넌트 → Hook → (필요 시) adapter → apiClient
```

컴포넌트가 `fetch`를 직접 부르지 않는다. **다만 이번에는 새 조회가 없다** — 훅이 이미 가진 데이터로 만든다.

MD 생성·Zip 조립은 순수 함수로 분리한다(`features/decision-log/exportMarkdown.ts` 등). 그래야 테스트가 된다.

---

## 5. 의존성

```bash
npm i jszip --workspace apps/web
```

- **브라우저 전용**이다. `packages/shared`에 넣지 않는다 (`CLAUDE.md` — shared는 브라우저 API에 의존하지 않는다)
- 타입 정의가 패키지에 포함돼 있어 `@types`는 필요 없다

---

## 6. 다운로드 방식

```text
1. JSZip으로 Blob 생성
2. URL.createObjectURL(blob)
3. <a download={파일명}> 클릭 트리거
4. URL.revokeObjectURL  ← 빠뜨리면 메모리 누수
```

**4번을 빠뜨리기 쉽다.** Blob URL은 명시적으로 해제해야 한다.

Artifact 환경의 브라우저 저장소 제약(`localStorage` 등)과는 무관하다 — 이건 사용자 로컬 파일 다운로드다.

---

## 7. 보안

**사용자 데이터가 파일로 나간다.** 두 가지만 확인한다.

- **파일명에 사용자 입력이 들어간다** → §2.3의 정규화로 경로 조작(`../`)과 제어문자를 막는다
- **본문에 비밀값이 없는지** → DecisionNote·FinalAnswer는 AI 생성물과 사용자 입력이고 키·토큰이 들어갈 경로가 없다. 그래도 Export 대상에 `input_snapshot`·`manager_meta` 같은 내부 메타를 **넣지 않는다**

---

## 8. Acceptance Criteria

- [ ] **AC1 (Zip)** — Chat의 DecisionNote들이 Question 순서대로 개별 MD로 묶여 내려받아진다. DecisionNote 없는 Question은 파일을 만들지 않는다.
- [ ] **AC2 (파일명)** — 파일명에 쓸 수 없는 문자가 제거되고, **같은 이름이 겹치면 번호가 붙어 덮어쓰기가 없다.**
- [ ] **AC3 (전체 MD)** — Chat의 모든 Question이 화면과 **같은 순서**로 한 장에 담긴다. 미완료 Question은 건너뛰지 않고 "진행 중"으로 표시된다.
- [ ] **AC4 (내용)** — 개별 MD와 전체 MD 모두 §2.2·§3.2 형식을 따르고, 3사 원문·Agenda·내부 메타가 포함되지 않는다.
- [ ] **AC5 (비활성)** — 내려받을 데이터가 없으면 버튼이 비활성이다. **상태가 아니라 데이터 유무로 판단한다.**
- [ ] **AC6 (계층)** — 컴포넌트가 `fetch`를 직접 호출하지 않는다. MD·Zip 생성이 순수 함수로 분리돼 있다.
- [ ] **AC7 (자원 해제)** — `URL.revokeObjectURL`이 호출된다.
- [ ] **AC8 (검증)** — 실제로 내려받아 압축을 풀고 내용을 확인한다. 루트 typecheck·lint·build 통과. `?scenario=` 회귀 없음.

---

## 9. 알려진 한계

| 한계 | 비고 |
|---|---|
| 여러 Chat을 한 번에 Export할 수 없다 | 요구에 없음 |
| 3사 원문·Agenda가 포함되지 않는다 | §3.2 — 필요해지면 확장 |
| Export 이력이 남지 않는다 | 요구에 없음 |
| 큰 Chat에서 브라우저 메모리를 쓴다 | Question 수십 개 수준에서는 문제없다 |
| macOS 기본 `unzip`(Info-ZIP 6.00)에서 한글 엔트리명이 깨진다 | **Zip은 정상이다.** UTF-8 플래그(bit 11)가 켜져 있고 Finder·`ditto`·Python `zipfile`은 올바로 읽는다. Info-ZIP 6.00이 플래그를 무시하는 문제라 **생성 측에서 고칠 방법이 없다.** 파일명 앞의 번호(`01_`)는 ASCII라 깨져도 순서는 유지된다 |

---

## 10. 개정 기록

| 일자 | 내용 |
|---|---|
| 2026-07-31 | 구현(T-021) 완료 후 확정. 구현 중 시그니처 1건 정정 — `buildFullMarkdown`이 `notes`를 받지 않아 전체 MD에서 결정 기록이 통째로 빠질 뻔했다(§3.2). Chat 제목도 파일명에 들어가므로 §2.3의 정규화를 공유하도록 명시(§7). macOS 기본 `unzip`의 한글 표시 문제를 §9에 기록 — 생성 측 결함이 아니다 |
| 2026-07-31 | 최초 작성. Epic 4의 Story 4-3·4-4. **서버 작업이 없다** — 데이터는 이미 조회되고 MD 생성·Zip·다운로드가 전부 브라우저에서 끝난다. 파일명 중복 처리(§2.3-5)와 미완료 Question 표시(§3.3)를 명시 — 둘 다 빠뜨리면 조용히 데이터가 사라지거나 순서가 어긋난다 |
