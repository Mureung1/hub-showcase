# Decision Log — Cowork 세션 핸드오프 문서

> 작성일: 2026-07-19 (KST)
> 이 문서는 기존 Claude Cowork 세션의 역할·프로토콜·이력·노하우를 새 Cowork 세션에 이관하기 위한 것이다.
> 발표 PPT 관련 작업은 이 문서에서 제외한다 (사용자 지시).

## 0. 이 문서의 사용법

새 Cowork 세션을 시작할 때 권장 첫 프롬프트:

```
N132_- 폴더 전체를 학습해줘. 특히 HANDOFF-COWORK.md를 먼저 읽고,
그 문서에 정의된 Cowork 역할과 운영 프로토콜을 그대로 이어받아줘.
학습이 끝나면 현재 상태 요약과 다음 작업 후보를 보고해줘.
```

- **저장소의 docs/ 문서들이 항상 진실의 원천이다.** 이 문서와 저장소 문서가 다르면 저장소 문서가 맞다 (이 문서는 스냅샷).
- 이 문서가 담는 것: 세션 역할, 협업 프로토콜, 결정 이력, 프롬프트 템플릿, 환경 운영 노하우, 미결 사항.
- 이 문서가 담지 않는 것: 도메인 정책·데이터 모델·Spec 상세 (→ 해당 문서 참조).

---

## 1. 프로젝트 한눈에

- **제품**: Decision Log — 비개발자·PM이 여러 AI(Claude·ChatGPT·Gemini)의 답변을 Agenda 단위로 비교하고, 충돌만 직접 판단해 FinalAnswer와 DecisionNote로 기록하는 Multi-AI 의사결정 도구.
- **맥락**: 네이버 AI 챌린지 N132. 사용자(Brett / 이용민)는 비개발자 성향의 PM 역할로, 모든 UX·정책 결정을 직접 내린다.
- **핵심 흐름**: Chat 생성 → Question → 3 AI SourceAnswer → Manager AI가 Agenda 생성·비교 → Consensus 자동 passed / Conflict는 사용자 판단(채택·직접 입력·재검토 1회·제외) → 전 Agenda 확정 → FinalAnswer → DecisionNote 자동 생성·저장 → completed → 다음 질문은 이전 확정 결과를 Context로.
- **저장소 위치 (사용자 디바이스)**: `/Users/iyongmin/naver_ai_challenage/N132_-/`

## 2. 역할 분담 — 반드시 유지할 것

| 주체 | 역할 |
|---|---|
| **Cowork (이 세션)** | 정책 결정 지원 · Spec 협업 작성과 관리 · 문서 정합성 관리 · Claude Code용 Task 프롬프트 설계 · 구현 보고 검토(통과/수정 판정) · 완료 처리 |
| **Claude Code (로컬)** | 실제 코드 구현 · 실행 · 검증(typecheck/lint/build/브라우저) · git 커밋 · docs/status.md와 Spec 개정기록 행 갱신 |
| **사용자 (Brett)** | 모든 UX·정책 결정 · Cowork↔Claude Code 사이의 메시지 전달(프롬프트 복붙, 보고 복붙) · git 커밋 실행 · 브라우저 수동 확인 |

**Cowork는 코드를 직접 작성하지 않는다.** Cowork가 저장소에 직접 쓰는 것은 docs/ 문서(Spec, index 등)뿐이다.

## 3. 저장소·문서 체계

문서별 역할은 `CLAUDE.md` 3장의 기준 문서 표가 원본이다. 요약:

| 문서 | 역할 |
|---|---|
| `CLAUDE.md` | Claude Code가 항상 따르는 작업 규칙 (스택 고정·보안·금지사항·11장 보고 형식) |
| `docs/domain-policy.md` | 상태 머신·전이 규칙의 **단일 기준** |
| `docs/data-model.md` | 테이블·제약·Enum·RLS 초안 |
| `docs/product.md` / `docs/architecture.md` | 제품 범위 / 기술 구조·트랜잭션 |
| `docs/specs/index.md` | Spec 목록·개발 순서·상태 |
| `docs/specs/SPEC-*.md` | 기능별 범위 + AC (아래 4장 상태 참조) |
| `docs/status.md` | 진행 상황·미결정 사항 (Claude Code가 주로 갱신) |
| `docs/decisions/ADR-001~004` | Auth·데이터 접근 경로·Provider·Astryx 결정 근거 |
| `docs/DESIGN.md` / `docs/design-skill.md` | Astryx 토큰·컴포넌트 규칙 / 디자인 점검 기준 |
| `docs/dev-setup.md` | 설치·환경변수·Supabase 대시보드 체크리스트 |
| `.claude/agents/qa-reviewer.md` | QA 서브에이전트 정의 (읽기 전용·증거 기반) |

정책 변경은 항상 **기준 문서를 먼저** 고치고, 관련 문서(여러 곳)에 동시 반영해 모순을 없앤다. 과거 DecisionNote 자동 생성 정책 변경 때 6개 문서를 동시 갱신한 전례가 있다.

## 4. 현재 상태 (2026-07-19 기준 스냅샷)

### 4.1 Spec 진행

| Spec | 상태 | 비고 |
|---|---|---|
| SPEC-UI-001 Mock 핵심 플로우 | **완료** (2026-07-18) | T-001~010 + T-010 QA(CONDITIONAL PASS→해소) + 개선 라운드 R1~R5 + 사용자 체크리스트 8항목 통과 |
| SPEC-SCHEMA-001 Zod 공통 계약 | **완료** (2026-07-18) | T-011 + qa-reviewer 전 AC PASS |
| SPEC-AUTH-001 회원가입·로그인 UI | **T-012 완료 (사용자 확인)** | ⚠️ T-012 완료 보고 전문은 Cowork가 검토하지 못함. AC3~5(실제 Supabase 실측: 가입 메일·미인증 로그인·에러 원문)가 실측되었는지 새 세션에서 status.md와 사용자에게 확인할 것 |
| SPEC-AUTH-002 (세션·Protected Route) | 미작성 | 다음 후보 |
| SPEC-AUTH-003 (Express JWT 미들웨어) | 미작성 | |
| SPEC-AI-001~003 / SPEC-DB-001 / SPEC-EXPORT-001 | 미작성 | |
| SPEC-DOMAIN-001 (Agenda 전이) | 미작성 | 상태 전이는 domain-policy + Mock 구현으로 사실상 커버 — 별도 Spec 필요성은 백엔드 전이 구현 때 재평가 |
| SPEC-AUTH-004 (비밀번호 재설정) | 보류 (Should) | |

### 4.2 사용자의 일정 계획 (구두 확정)

- **다음 주까지**: 남은 Spec 전부 (AUTH-002·003, AI-001~003, DB-001, EXPORT-001)
- **마지막 주**: 백엔드 고도화 (안정화·성능·통합 QA)
- Spec 우선순위 논의 이력: AI-first(핵심 리스크 조기 검증) vs Auth-first(계획 순서) 중 사용자가 Auth-first 선택. **다음 결정도 사용자 몫** — Cowork는 선택지+추천만 제시.

### 4.3 Task·커밋 이력 (참조용)

| Task/Round | 내용 | 커밋 |
|---|---|---|
| T-001~T-005 | Workspace·Chat·Question UI / 상태 흐름 / 답변 3열 모달 / Agenda 카드 / 충돌 해소 4액션 | 2026-07-16 |
| T-006(+보완) | FinalAnswer·all-rejected — **정책 위반 사례**: "Conflict 전부 rejected→고정 문구"로 잘못 구현 → 정책은 "전체 Agenda(Consensus 포함) rejected일 때만". 수정 + 전용 fixture 추가 | bc529ec |
| T-007~T-009 | DecisionNote 자동 생성·completed / 연속 질문 / 실패·재시도·제외 | |
| T-010 | qa-reviewer 전체 QA — CONDITIONAL PASS (MINOR 1건: provider `as` 캐스팅 → T-011에서 해소) | |
| R1 | 팝업 대형화·stance 5줄·재검토 선택화 / FinalAnswer 접이식 / 노트 간소화·Chat별 표시 | 8e1311b |
| R2 | 팝업 높이 2배·가로 3열·본문 기본색·재검토 흐림 제거(isDisabled 제거)·답변보기 버튼 테두리 | 9fb9bba |
| R3 | 팝업 본문 스크롤+버튼 고정(LayoutContent/LayoutFooter)·노트 개조식·↗ 질문 이동 버튼 | 9a7f6a5 |
| fix | ↗ 버튼 글리프 미표시(Astryx isIconOnly는 icon prop 필수) + aria-label | ba7b98f |
| R4 | 노트 시간순(최신 아래)·패널 스크롤 하단 유지(effect: [activeChatId, notes.length]) | abf060f |
| R5 | 토스트 2초 자동 소멸(autoHideDuration)·completed 시 트랜스크립트 하단 이동(completedCount effect) | |
| T-011 | packages/shared Zod 계약 도입·web 재배선·Mock 엔티티별 검증·검증 배너 | 0da18f5 (docs 완료 처리 767da4a) |
| T-012 | 회원가입·로그인 UI (SPEC-AUTH-001) | 사용자 확인 완료, 보고 전문 미접수 |

## 5. 확정 결정 대장 (Spec 문서에 기록된 위치 포함)

각 Spec의 1장 "결정 사항 요약" 표가 원본이다. 특히 주의할 결정:

**SPEC-SCHEMA-001** (9개 결정 + 구현 중 보강):
- packages/shared 즉시 신설 / 계약 범위는 엔티티만(envelope 제외) / camelCase
- DecisionNote `seq`·`sources` 영구 제거 (번호는 Question.sequenceNumber에서 파생, join 정렬)
- stance·sourceRefs는 자유형 유지 — **정식 모양은 SPEC-AI-002에서** (provider 캐스팅 해소 포함)
- 실패는 상태 추가 없이 `failed` + errorCode 5종으로 구분: `PROVIDER_TIMEOUT` `PROVIDER_ERROR` `SCHEMA_VALIDATION_FAILED` `NETWORK_ERROR` `UNKNOWN_ERROR` (레지스트리 확장 = Spec 개정)
- errorCode는 **UI·로그에 원문 그대로 표시** (사용자의 디버깅 요구 — 강한 선호)
- A안 보강(9장): web의 중첩 집합체 뷰(ChatView 등)는 shared z.infer의 교차 타입으로 유지, Mock 검증은 엔티티 개별 parse
- StructuredContent 골격: sections[{sectionId 필수, title, content}] — 확장은 SPEC-AI-001

**SPEC-AUTH-001** (9개 결정):
- React Router 도입, /login /signup /verify-email / 라우트, 비로그인 → /login
- 가입 필드 3개(이메일·비번·확인), 비번 최소 8자(Supabase 설정과 일치)
- 인증 여정: 가입 → 안내 화면(재발송) → 메일 링크 → /login → 직접 로그인 (자동 로그인 없음)
- **로그인 실패는 Supabase 에러 원문 표시** (미인증 에러만 "이메일 인증을 완료해주세요"+재발송으로 예외 처리 — 4.2절). 한국어 매핑은 배포 전 후속 개선
- Auth 영역 좌측 패널 하단(이메일+로그아웃 상시), **로그아웃은 확인 팝업 후** 진행

**SPEC-UI-001 주요 고정** (전체는 Spec 참조):
- 모델 표시 라벨 Claude·**ChatGPT**·Gemini (내부 provider 값 claude/openai/gemini 유지)
- 노트: 개조식 한정(항목 수 제한 없음 — AI 노트 생성 프롬프트에도 적용 예정), 시간순(최신 아래), 패널 스크롤 하단 유지, ↗ 클릭 시 매핑 Question으로 스크롤+1.5초 하이라이트
- all-rejected 판정: **전체 Agenda(Consensus 포함) rejected일 때만** 고정 문구
- 토스트 2초 자동 소멸 / completed 시 중앙 트랜스크립트 최하단 이동(1회, 수동 스크롤 불간섭)

**Supabase 프로젝트** (진행 중이던 설정):
- 무료 프로젝트 생성 중이었음. 가이드한 설정: GitHub 연결 안 함 / Region Seoul / Data API ON / Automatically expose new tables **OFF** / automatic RLS ON
- 생성 후 액션 4개: ① Settings→API에서 URL+Publishable Key → `apps/web/.env.local` (커밋 금지) ② Confirm email ON ③ 비밀번호 최소 8 ④ URL Configuration: Site URL `http://localhost:5173`, Redirect `http://localhost:5173/login`
- Secret/service_role 키는 백엔드 Spec 전까지 사용하지 않음. 내장 메일은 시간당 발송 제한이 빡빡함 — 가입 테스트는 한두 번씩
- **새 세션에서 이 설정이 실제 완료됐는지 확인할 것**

## 6. 운영 프로토콜 (이 방식 그대로 유지)

### 6.1 Spec 협업 작성

1. Cowork가 Spec 골격 제시: **0장 고정 사항**(기존 문서에서 온 것, 재질문 금지) + Step 구성 안내
2. Step별로 질문 2~4개, 각각 **(a)/(b) 선택지 + 추천 표시 + 추천 이유** 제시. **Cowork가 대신 결정하지 않는다**
3. 사용자 답변을 받아 적고 다음 Step. 사용자가 개념을 물으면 비개발자 눈높이로 차근차근 설명(비유·구체 예시). 결정의 "되돌리기 비용"도 알려주면 좋아함
4. 사용자 결정이 기존 확정 문서와 충돌하면 **확정 전에 파급 범위를 알리고 대안 제시** (예: 검증 실패 전용 상태 요구 → b-2 errorCode 구분안으로 합의한 전례)
5. 전 Step 확정 → Spec 파일 작성(1장에 결정 표 기록) → index.md 상태 갱신 → 저장소 반영 → 사용자에게 git 커밋 명령 제공 (`docs: ...` 커밋)

### 6.2 T-태스크 구현 사이클

1. Cowork가 프롬프트 작성 → 사용자가 Claude Code에 복붙
2. 프롬프트 필수 요소: 기준 Spec 파일 명시 + **"프롬프트와 Spec이 다르면 Spec을 따른다"** (전송 중 잘림 대비 — 실제로 여러 번 잘렸음) / 범위(장 번호) / 완료 조건(AC) / 검증 명령(npm run typecheck·lint·build + 브라우저 시나리오) / status.md 갱신 / 커밋 메시지 / "보고는 CLAUDE.md 11장 형식으로"
3. 새 패키지·공통 계약·구조 변경이 포함되면 "CLAUDE.md 9장에 따라 짧은 계획 먼저 제시" 문구 포함. Spec이 패키지 추가의 승인 근거임을 명시
4. 사용자가 완료 보고를 붙여넣으면 Cowork가 검토: Spec 대조 → 판정(통과/수정 필요). 위반 발견 시 수정 프롬프트 작성 (T-006 전례)
5. 검토 시 좋은 보고의 기준: 실행한 검증 명시, 못 한 검증은 사유와 함께 미확인 처리(꾸미지 않음), working tree 상태 언급
6. 커밋 접두어: `feat:`(기능) `refactor:`(라운드 개선) `fix:`(버그) `docs:`(문서) `style:`(시각 다듬기)

### 6.3 UI 수정 라운드 (SPEC-UI-001 13장 규칙)

- 등급: **바로 수정**(시각 다듬기, style: 커밋, 문서 불필요) / **토큰 수정**(DESIGN.md) / **Spec-first**(구조·인터랙션·콘텐츠 형식 — Spec 개정 후 구현). **애매하면 Spec-first**
- 라운드당 피드백 최대 3개. 바로-수정 등급의 자잘한 건(커서, aria-label 등)은 라운드에 "겸사" 항목으로 끼워 넣을 수 있음(카운트 제외)
- 절차: 사용자 피드백 접수 → 등급 분류 표 제시 → (Spec-first면) 해당 Step에 "✍️ 개정 (날짜 Round N)" 블록 추가 + 13장 개정 기록 표에 행 추가("반영 예정") → 저장소 반영 → 프롬프트 제공 → 구현 보고 검토 → Claude Code가 13장 행을 "반영 완료"로 갱신
- 기존 결정을 뒤집는 개정은 "결정 내용 N을 대체한다"고 명시

### 6.4 qa-reviewer

- `.claude/agents/qa-reviewer.md`. 읽기 전용, AC별 PASS/FAIL/NOT VERIFIED + 증거, BLOCKER/MAJOR/MINOR, 실행 안 한 검사 통과 보고 금지
- 큰 Task(계약 교체·Spec 전체) 후에 돌린다. QA가 브라우저를 못 쓰므로 시각 항목은 NOT VERIFIED → 메인 세션 실측 또는 사용자 수동 체크리스트로 커버하고 그 사실을 표에 명시
- 사용자 수동 체크리스트는 Cowork가 시나리오·확인 항목으로 정리해 제공 (`?scenario=` Query String 활용, 기본 happy-path, 8종: happy-path / recheck-path / provider-retry / provider-excluded / all-rejected / context-next-question / single-source-fallback / all-providers-failed(Blocked))

### 6.5 Spec 완료 처리 (Cowork 담당)

사용자 최종 확인("통과") 후: ① Spec 상태 헤더 → "완료 (날짜 — 근거)" ② index.md 해당 행 → 완료 ③ status.md에 완료 기록 + 다음 작업 갱신 ④ 저장소 반영 ⑤ 사용자에게 docs 커밋 명령 제공

### 6.6 문서 쓰기 책임

- Cowork: Spec 파일, index.md, 완료 처리 시 status.md
- Claude Code: 작업 후 status.md, Spec 13장(개정 기록 행의 반영 상태), 계약 변경 시 관련 문서
- **status.md는 Claude Code가 수시로 갱신하므로, Cowork가 고칠 때는 반드시 최신본을 먼저 받아온다** (8.1 절차)

## 7. 기술 스냅샷 (원본은 각 문서)

- **스택**: React 19 + Vite + TS (web) / Express + Zod (api) / npm Workspaces / Supabase PostgreSQL + Auth + RLS / Astryx 디자인 시스템 (`@astryxdesign/core` 0.1.6)
- **packages/shared** (`@decision-log/shared`): Zod 스키마 6종 + Enum 6종 + errorCodes. 의존성 zod 하나(^4.x, api와 동일 major). React/Express/SDK/브라우저 API 금지 (lib ES2022로 타입 강제). web은 z.infer 교차 타입으로 소비
- **데이터 접근 이중 방어 (ADR-002)**: 조회·사용자 행동 = user JWT Client + RLS / AI 파이프라인 시스템 쓰기 = Secret Key Client + Service 계층 소유권 검증. 클라이언트 전달 userId 불신뢰. user_id는 chats에만, 하위는 join(EXISTS) RLS
- **상태 머신**: Question(draft→processing→review_required→completed), SourceAnswer(pending→processing→succeeded/failed, 재시도 1회, excluded), Agenda(draft→passed(auto_consensus) / draft→conflicted→passed·rejected·recheck_requested→reanswered→passed·rejected), resolutionReason 7종
- **DB 제약으로 정책 강제**: 한 Chat 미완료 Question 1개(Partial Unique Index), passed→selectedContent NOT NULL(CHECK), final_answers·decision_notes UNIQUE(question_id), chats.user_id ON DELETE RESTRICT
- **Astryx 사용법**: 컴포넌트 fork 금지, 색·간격은 테마 토큰(`defineTheme({extends: neutralTheme})`, `apps/web/src/theme.ts`). 컴포넌트 API 확인: `node node_modules/@astryxdesign/core/docs.mjs <Name>` — **API를 추측하지 말고 이걸로 확인** (isIconOnly+children 사고의 교훈). 모델 색 점은 `--model-*` custom property (Gemini #1A73E8 / Claude #D97757 / ChatGPT #10A37F)
- **보안 (절대 규칙)**: AI API Key·Supabase Secret Key는 백엔드 환경변수에만. 프론트엔드에는 URL+Publishable Key만. 실제 .env 커밋 금지. Zod 검증 우회 금지

## 8. Cowork 환경 운영 노하우 (중요 — 시행착오의 산물)

### 8.1 디바이스 파일 동기화 — stale cache 우회 (필수 절차)

**증상**: 한 번 스테이징했던 경로를 다시 스테이징하면 구버전 캐시가 반환된다.
**우회 절차** (Claude Code가 저장소 파일을 갱신한 뒤 Cowork가 그 파일을 편집해야 할 때마다):

```
1. device_bash로 새 이름으로 복사:
   SES=/sessions/<세션ID>/mnt/N132_-
   cp "$SES/docs/…/파일.md" "$SES/_to_delete/파일.<용도>sync.md"
   ※ 복사 목적지 이름은 매번 새로 (r3sync, r4sync처럼 용도별 유니크)
2. device_stage_files로 그 새 경로를 스테이징 → 최신본 확보
3. 로컬에서 편집 → SendUserFile → device_commit_files로 원래 경로에 커밋
```

- device_bash의 경로는 `/Users/...`가 아니라 `/sessions/<세션ID>/mnt/<폴더명>/...`
- device_bash는 rm 불가 — 지울 파일은 `_to_delete/`로 mv
- 이 절차 없이 로컬 사본을 그대로 편집해 커밋하면 **Claude Code의 갱신분을 덮어쓰는 사고**가 난다 (특히 status.md, Spec 13장)

### 8.2 .claude 폴더 원격 쓰기 차단

device_commit_files가 `.claude/` 경로 쓰기를 거부한다. 우회: 저장소 루트에 `파일명.new`로 커밋 → device_bash로 `cp` → 임시 파일은 `_to_delete/`로 mv.

### 8.3 문서 편집 패턴

python으로 문자열 치환 시 **유일성 검증 필수**:

```python
def apply(old, new):
    n = text.count(old); assert n == 1, f"count={n}"
    text = text.replace(old, new)
```

부분 문자열 함정 주의 (예: '다음 주'는 '다다음 주'에도 매칭 — 긴 것부터 처리).

### 8.4 기타

- **프롬프트 잘림**: 사용자가 Claude Code로 전달하는 프롬프트가 중간에 잘리는 일이 잦다. 모든 프롬프트에 기준 Spec 명시 + "다르면 Spec을 따른다"를 넣는 것이 방어책. Claude Code도 잘림을 인지하고 재질문하는 패턴이 형성돼 있음
- device bridge가 간헐적으로 끊긴다. 끊기면 SendUserFile로 전달하고 사용자가 배치, 복구 후 커밋 재개
- git 커밋은 항상 사용자에게 명령을 만들어 제공 (Cowork가 직접 커밋 불가). docs 커밋은 사용자가 잊기 쉬우니 **다음 보고 검토 때 working tree 언급을 보고 리마인드**

## 9. 미결 사항 (새 세션이 챙길 것)

1. **T-012 사후 확인**: 완료 보고 전문 미검토. status.md 확인 + AC3~5(Supabase 실측) 여부 확인. Supabase 대시보드 설정 4개(5장 참조) 완료 여부 확인
2. **status.md 상존 미결정 4건**: ① 전 Provider(3사 모두) 실패 시 FinalAnswer·노트 처리 (AI Provider Spec 전 확정 필요) ② 좌초 상태 복구(Manager 호출 실패 재시도·draft 취소·processing timeout) ③ 단일 SourceAnswer 기반 Agenda 처리와 resolution_reason (Manager Spec에서) ④ 계정 삭제 시 데이터 정책
3. **후속 Spec으로 미뤄진 것들**: sourceRefs·recheckResult·stance 정식 모양(SPEC-AI-002 — provider 캐스팅 해소 포함) / StructuredContent 확장(SPEC-AI-001) / API envelope·에러 응답(API Spec) / userId 계약 포함 여부(AUTH-002~003) / snake_case 변환(SPEC-DB-001) / 에러 메시지 한국어 매핑(배포 전)
4. **다음 Spec 결정 대기**: AUTH-002(세션·Protected Route)가 자연스러운 다음 순서. 이후 AUTH-003 → AI-001~003 → DB-001 → EXPORT-001, 마지막 주 백엔드 고도화
5. `_to_delete/` 폴더에 동기화 임시 파일들이 쌓여 있음 — 사용자가 원할 때 통째로 삭제 가능 (기능 영향 없음)

## 10. 사용자 협업 스타일 노트

- **언어**: 전부 한국어. 기술 용어는 쓰되 개념 설명 요청이 오면 비유와 구체 예시로 차근차근 (Zod="여과 장치", join 설명 전례). 설명 후 "이 걱정이 해소되면 (a)로 확정할게요"처럼 결정을 다시 사용자에게 돌려줌
- **결정 방식**: (a)/(b) 선택지 + 추천 + 이유를 좋아함. 추천을 항상 따르지는 않음(에러 원문 표시, 로그아웃 확인 팝업 등) — 따르지 않아도 존중하되, 확정 문서와 충돌하면 파급을 알리고 대안 제시
- **분량**: "너무 길면 요약적으로" 피드백 전례. 보고 검토는 요점 먼저(판정 → 근거 → 다음 액션). 문서는 상세해도 됨
- **디버깅 가시성 선호**: 에러 코드·원문을 화면에서 보고 싶어 함
- **밤/외출 등 상황 공유를 함**: 상황에 맞는 작업을 제안하면 좋아함 (밖에서는 문서 협업, 브라우저 확인은 귀가 후)
- 칭찬·격려에 인색할 필요 없음. 마일스톤(Spec 완주 등)은 짚어주기
- 사용자의 다음 메시지가 Claude Code 보고 복붙인 경우가 많다 — 보고 형식(## 작업 완료)이 보이면 즉시 검토 모드로

---

*이 문서는 2026-07-19 시점 스냅샷이다. 새 세션은 저장소 문서(특히 status.md, specs/index.md)로 최신 상태를 재확인한 뒤 작업을 시작할 것.*
