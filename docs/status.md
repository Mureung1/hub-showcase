# 현재 진행 상황

## 최근 결정 (2026-07-16)

- Supabase Auth 이메일·비밀번호 인증을 MVP에 추가하고, 이메일 인증 완료를 서비스 이용의 필수 조건으로 한다.
- 사용자 식별자는 `auth.users.id`를 사용하고, `sessionId`는 인증 사용자 데이터 소유권에 사용하지 않는다.
- React는 Supabase Auth에 한해 Supabase를 직접 호출한다. 서비스 데이터는 Express API를 거친다.
- 조회·사용자 행동은 user JWT Client(RLS 적용), AI 파이프라인의 시스템 쓰기는 Secret Key Client + Service 계층 소유권 검증으로 처리한다.
- MVP AI Provider는 Claude, OpenAI, Gemini 3개다.
- 정책·DB 모델 초안 v2.1을 확정하고 `docs/domain-policy.md`, `docs/data-model.md`로 분할 반영했다.
- Consensus Agenda도 `selected_content`에 합의 내용을 저장한다.
- `chats.user_id`는 ON DELETE RESTRICT, Chat title은 첫 질문 앞 100자, `updated_at`은 DB Trigger 자동 갱신, DecisionNote는 저장 후 수정 불가.
- DecisionNote는 MVP에서 FinalAnswer 확정 직후 자동 요약으로 생성·저장한다. 사용자 편집 기능은 후속 버전으로 미룬다 (SPEC-UI-001 Step 8에서 결정, domain-policy 반영).
- 모델 표시 라벨은 ChatGPT로 통일한다(내부 provider 값은 `openai` 유지).
- 디자인 시스템으로 Astryx(`@astryxdesign`)를 도입한다. `docs/DESIGN.md`를 Astryx 기반으로 개정했다 (ADR-004).

## 미결정 사항

- 모든 Provider(Claude·OpenAI·Gemini)가 최초 요청과 1회 재시도에 모두 실패한 경우의 FinalAnswer 고정 문구와 DecisionNote 처리 — AI Provider Spec 작성 전에 확정 → **SPEC-AI-001 §6.2에서 확정(2026-07-22): 3사 전멸 시 고정 안내 문구로 마무리+완료. 서버 generation_mode 확장은 AI-003 재검토**
- 좌초 상태 복구 정책 — Manager AI 비교·재검토·FinalAnswer 생성 호출 실패 시 재시도 규칙, 버려진 `draft` Question 취소, 중단된 `processing` Question timeout 회수 → **SPEC-AI-001에서 이번 범위 밖으로 확정, 마지막 주 안정화로 이관(2026-07-22, 알려진 한계: 갇힌 질문이 새 질문 차단 가능)**
- 단일 SourceAnswer 기반 Agenda 처리 방식과 `resolution_reason` — Manager AI Spec에서 구체화 → **SPEC-AI-002 §3.4·§9.2에서 확정(2026-07-30): `kind="single_source"` + `auto_single_source` 자동 통과, 실제 참조 유지. 다중 AI 합의로 표현하지 않음(domain-policy 5.3). 계약·마이그레이션·Mock 반영은 T-019.1**
- 사용자 계정 삭제 시 데이터 처리 정책

## 완료된 작업

- 개발 환경 설정 완료 (`docs/dev-setup.md` 14장)
- Mock 단일 화면(App.tsx)과 HTML 프로토타입 2종
- 인증·정책·DB 문서 체계 정비 (product / architecture / domain-policy / data-model / specs / decisions)

## 현재 작업

- **SPEC-UI-001 전체 QA 완료 (T-010, 2026-07-16)** — qa-reviewer 판정 **CONDITIONAL PASS**
  - AC-1~AC-7 전 항목 코드 레벨 PASS, single-source-fallback(Should) 포함. BLOCKER/MAJOR 0건
  - MINOR 1건: `AgendaStance.provider: string`의 `as Provider` 캐스팅 — Spec 0.6 임시 계약 특성으로 수정 불요, SPEC-SCHEMA-001(Zod)에서 해소 예정
  - 기술 규칙 위반 없음: `any`/`localStorage`/`fetch` 직접 호출 0건, 시나리오 전환기 실사용 UI 비노출, 근거 없는 stance 저장 없음
  - typecheck / lint(web) / build 통과. `apps/api`에는 lint script 없음(미검사), test script 없음(검사 수단 없음)
  - 각 Task(T-001~T-009) 완료 시점에 브라우저 시나리오 확인을 수행했으며, qa-reviewer가 코드로 판정 불가한 시각·인터랙션 항목(NOT VERIFIED)은 사용자 수동 확인 체크리스트로 전달함 — 최종 확정은 사용자 확인 후
- SPEC-UI-001 확정 완료(Ready). 구현 단계 진입 (`docs/specs/SPEC-UI-001-mock-flow.md` 12장 Task 순서)
- T-001 기본 Workspace·Chat·Question UI 완료 (2026-07-16)
  - Astryx 0.1.6 설치 (`@astryxdesign/core`·`theme-neutral`·`cli`, React 19 호환 `react >=19.0.0` 확인)
  - 브랜드 테마 `apps/web/src/theme.ts` (defineTheme 토큰 오버라이드, DESIGN.md 4장 변수명 확정)
  - 3단 레이아웃, 빈 화면(인사+중앙 컴포저+예시 칩), 질문 전송(Chat 생성·제목 100자·draft→processing), Chat 목록 ● 표시·전환, 새 채팅 확인 팝업, 처리 중 컴포저 비활성("충돌 해결 중"), 우측 노트 패널(빈 상태+MD Zip 비활성 버튼)
  - typecheck/lint/build 통과, 브라우저 시나리오 확인 완료
- 모델 표시 라벨을 ChatGPT로 통일 반영 완료 (내부 provider 값은 `openai` 유지, DESIGN.md 4장 규칙).
- T-002 Question·SourceAnswer 상태 흐름 완료 (2026-07-16)
  - 0.6 임시 계약 SourceAnswer 타입 적용 (retryCount, excludedFromComparison, sectionId 있는 Section 배열)
  - 로딩 말풍선 Provider 3줄 상태 표시 (pending 회색 점 / processing 스피너 / succeeded 초록 ✓ / failed 빨간 ✕)
  - happy-path 0.6/1.2/1.8초 순차 성공, 3개 최종 상태 시 답변 카드로 즉시 교체 (카드 내용은 T-003~T-004 placeholder)
  - `?scenario=` Query String 전환 골격 (`features/chat/scenarios.ts`, 기본 happy-path) — 실패 시나리오 타임라인은 T-009에서 구현

- T-003 AI Answers 카드와 열람 UI 완료 (2026-07-16)
  - 답변 카드 상단 오른쪽 "AI 별 답변 보기" 버튼 → 화면 90% 이상 대형 모달(Astryx Dialog)
  - Claude·ChatGPT·Gemini 3열 동시 표시, 각 열 독립 세로 스크롤, 열 상단 모델 색 점 + 모델명
  - 전문(full text) 스타일 렌더링, 내부 데이터는 sectionId Section 배열 유지 (0.6 계약)
  - 제외 Provider 열 렌더 분기(실패 안내 + errorCode)는 구조만 — T-009에서 활성화
  - 배경 클릭·× 두 방법으로 닫기 확인

- T-004 Agenda 카드와 상태 전이 완료 (2026-07-16)
  - SourceAnswer 최종 상태 도달 시 Mock Manager 결과 생성: Consensus 1건 + Conflict 2건 (0.6 계약, stances.sourceRefs가 실제 sourceAnswerId·sectionId 참조)
  - Consensus: draft→passed(auto_consensus)+selectedContent, "자동 통과 N건" 접힘 요약(기본 접힘)
  - Conflict: draft→conflicted, "충돌 지점 (남은/전체)" 헤더 + 제목·입장 한 줄 요약·미해소 뱃지·[해결] 버튼
  - 해소 전이 로직(`resolveAgenda`)과 제거 애니메이션 CSS(.conflict-item.removing), (0/N) 도달 시 "✓ 충돌 해결 완료" 뱃지 준비 — 화면 검증은 T-005 팝업과 함께
  - [해결] 버튼은 T-005 전까지 동작 없음

- T-005 재검토·직접 입력·제외 흐름 완료 (2026-07-16)
  - 충돌 해소 팝업(Astryx Dialog): 입장 카드 선택(SelectableCard 하이라이트)→[채택](초기 비활성+안내 문구), [내 결정](textarea, 빈 값 반영 불가), [내용 제외], [재검토](요청 내용 입력 필수→스피너→파란 recheckResult 박스→3버튼, 재표시 금지)
  - resolutionReason 매핑: user_accepted/user_composed/user_rejected + *_after_recheck, 배경 클릭·× = 판단 보류
  - 해소 토스트("Agenda가 채택되었습니다"/"Agenda를 최종 답변에서 제외했습니다", ToastViewport) + 제거 애니메이션 → 카운터 감소 → (0/N) "✓ 충돌 해결 완료" 화면 검증 완료
  - recheck-path 시나리오로 재검토+직접 입력 조합 확인

- T-006 FinalAnswer와 all-rejected 흐름 완료 (2026-07-16)
  - 모든 Agenda 최종 처리 시 FinalAnswer 자동 생성 (Question당 1회, 재생성 버튼 없음)
  - 블록 순서: ✓뱃지 → 공통 권장 사항(auto_consensus) → 결정 사항(사용자 판단, 초록 박스) → 제외 항목 한 줄 → 최종 답변 본문(상세 전문) → 출처 AI
  - all_agendas_rejected 판정은 domain-policy 기준 전체 Agenda(Consensus 포함)가 rejected일 때만 — passed가 1개라도 있으면(예: auto_consensus) 정상 FinalAnswer 생성 (T-006 보완 반영)
  - `?scenario=all-rejected` 전용 fixture(Consensus 0 + Conflict 2) 추가 — 시나리오별 Agenda 템플릿 선택 구조(`ScenarioConfig.agendaTemplates`)
  - `single_source_fallback` 분기·각주 문구 준비 (T-009 시나리오에서 노출)
  - FinalAnswer 표시 후에도 Question은 review_required 유지 (completed 전환은 T-007)

- T-007 DecisionNote 자동 생성과 Question 완료 (2026-07-16)
  - FinalAnswer 생성과 같은 상태 갱신에서 DecisionNote 자동 생성·저장 → Question `completed` 전환 (저장 후에만 completed — 고정 정책)
  - Mock 요약: 공통 권장 + 결정 사항 개조식 bullet, all_agendas_rejected는 고정 문구 그대로 저장
  - Right 패널 노트 카드([최종 결론 #N] + 제목 + 개조식 + 출처 AI, 역순 표시, 읽기 전용) 즉시 추가
  - 완료 전환은 조용히: 입력창·전송 재활성(토스트 없음), Chat 목록 빨간 ● 제거
  - 수정: completed 후 답변 카드가 사라지던 렌더 조건 버그 수정 (review_required || completed)

- T-008 다음 Question과 연속 질문 완료 (2026-07-16)
  - completed 후 같은 Chat에서 연속 질문 — 동일 파이프라인 반복, 트랜스크립트에 완료 카드·새 질문 누적, Question.sequence 증가
  - Decision Note #1·#2 누적과 최신 위 역순 표시 화면 검증 (T-007 잔여)
  - `?scenario=context-next-question` fixture: 완료 Question 2개(FinalAnswer·노트 보유) Chat + 노트 2개 초기 누적, 전환 시 기록 복원·스크롤 맨 아래·3번째 질문 시작 확인
  - Context Preview UI는 MVP 제외 (Step 9 확정) — 연속 질문 흐름만 검증

- T-009 실패·재시도·제외 시나리오 완료 (2026-07-16)
  - Step 10 확정: 자동 재시도(수동 Retry 버튼 없음). 로딩 말풍선 줄 상태 — 실패 빨간 ✕ → "재시도 중…" 라벨+스피너(retryCount=1) → 최종 제외 "제외됨" 회색(숨기지 않음)
  - `provider-retry`: ChatGPT 0.8초 실패 → 자동 재시도 → 1.5초 후 성공, 이후 3개 답변 기준 정상 진행
  - `provider-excluded`: 실패 → 재시도 → 재실패(~2.5초) → excludedFromComparison=true + errorCode(PROVIDER_TIMEOUT), 답변 카드 상단 고정 배너("○○ 답변을 불러오지 못해 비교에서 제외했습니다"), 3열 모달 해당 열에 실패 안내+에러 코드, 성공한 2개 입장만 Agenda 근거로 사용해 끝까지 진행 (Gemini 성공은 3.0초로 늦춰 "제외됨" 회색 줄이 보이는 구간 확보)
  - `single-source-fallback`(Should): 2개 재실패·1개 성공 → generation_mode=single_source_fallback, FinalAnswer 하단 각주 활성. 전용 Agenda 템플릿은 단일 Provider(Claude) 입장만 담고 합의/Consensus 표현·자동 통과 라벨 미사용 (단일 소스 Agenda 정책 미확정 — Mock 단순화, 코드 주석 명시)
  - all-providers-failed는 정책 미확정(Blocked)으로 구현하지 않음

- UI 개선 라운드 1 반영 완료 (2026-07-17, Spec 13장 R1 — Step 6·7·8 개정)
  - 충돌 해소 팝업 대형화(880px)·stance 텍스트 5줄 이상 보강(카드 내 스크롤)·하단 버튼 간격 확보
  - 재검토 추가 의견 필수 → 선택("추가 의견이 있으면 입력하세요 (선택)", 빈 값 시작 가능, recheckRequest는 있을 때만 저장)
  - FinalAnswer 표시 후 "자동 통과 N건" 요약 제거(해소 중엔 유지), 공통 권장·결정 사항을 왼쪽 토글 접이식(기본 접힘)으로 재구성
  - 노트 카드 간소화(뱃지·출처 삭제, 제목+개조식만)·최대 높이 제한+말줄임·활성 Chat 기준 표시(DecisionNote.chatId 추가, 데이터는 전역 보관+표시만 필터)
  - typecheck/lint/build 통과, 브라우저: happy-path 완주·빈 값 재검토·Chat 2개 노트 분리 확인

- UI 개선 라운드 2 반영 완료 (2026-07-17, Spec 13장 R2 — Step 6 R2 + style)
  - 충돌 해소 팝업: 높이 2배 수준(min-height)·폭 1180px, 입장 카드 세로 스택 → 가로 3열(모델 헤더 + 본문, 열 내부 세로 스크롤 — T-003 3열 모달 패턴)
  - stance 본문을 기본 텍스트 색으로 명확화, 재검토 중·후 카드 흐림 제거(SelectableCard isDisabled 제거, 선택은 onChange 가드로 conflicted에서만)
  - "AI 별 답변 보기" 버튼 variant ghost → secondary (테두리 상시 표시)
  - 선택 UX(카드 클릭 → 하이라이트 → [채택] 활성)와 안내 문구는 기존 결정 유지
  - typecheck/lint/build 통과, 브라우저: happy-path 선택·채택, recheck-path 빈 값 재검토·재검토 중/후 텍스트 명확성 확인

- UI 개선 라운드 3 반영 완료 (2026-07-17, Spec 13장 R3 — Step 6·8)
  - 충돌 팝업 [본문(스크롤)]+[하단 버튼(고정)] 2단 — 본문은 Astryx LayoutContent, 버튼은 LayoutFooter. 긴 재검토 결과에서도 버튼 하단 고정(DOM 검증: footer가 스크롤 컨테이너 밖)
  - DecisionNote 개조식 한정 — 템플릿에 `noteBullet`(개조식) 추가, buildMockDecisionNote가 긴 selectedContent 대신 noteBullet 사용(서술형 문단 제거)
  - 노트 카드 우상단 ↗ 버튼 — 클릭 시 매핑 Question 블록(data-question-id)으로 scrollIntoView + 1.5초 하이라이트(--color-accent box-shadow). state 구조 미변경(DOM 조회 방식)
  - R2 잔여: 재검토 뷰 선택 불가 카드를 정적 div로 렌더(포인터 커서·흐림 제거)
  - typecheck/lint/build 통과, 브라우저: recheck-path 긴 결과 버튼 고정·정적 카드 명확·노트 개조식·↗ 이동+하이라이트 확인

- UI 개선 라운드 4 반영 완료 (2026-07-17, Spec 13장 R4 — Step 8)
  - 노트 정렬 시간순(최신 아래)으로 변경 — `.reverse()` 제거, Question 순서 그대로 위→아래(중앙 트랜스크립트와 같은 방향)
  - 패널 스크롤 최하단 자동 유지 — `useEffect([activeChatId, notes.length])`로 새 노트 추가·Chat 진입/전환 시점에만 `scrollTop = scrollHeight`. 그 외 렌더(사용자 스크롤)에는 미관여 → 위로 읽기 방해 없음
  - App이 `activeChatId`를 패널에 전달(전환 트리거)
  - typecheck/lint/build 통과, 브라우저(context-next-question, 노트 4개): 시간순 정렬·새 노트 하단 이동(overflowing 시)·Chat 재진입 하단 시작·위 스크롤 유지·↗ 이동 회귀 모두 확인

- UI 개선 라운드 5 반영 완료 (2026-07-18, Spec 13장 R5 — Step 6·8)
  - 토스트 2초 자동 소멸 — `finalizeResolution`의 `toast()`에 `autoHideDuration: 2000`(상수 `TOAST_AUTO_HIDE_MS`) 추가. Astryx Toast 계약 확인: `ToastViewport` `dur = autoHideDuration ?? 5000` → 각 Toast `setTimeout(dismiss, dur)`(Toast.js), `isAutoHide` info 기본 true. 창 포커스 시 정확히 2초 소멸, 비포커스 시 pause는 Astryx 의도 동작
  - completed 전환 시 중앙 트랜스크립트 하단 이동 — ChatCenter에 로컬 `layoutRef`(ChatLayout root=자체 스크롤 컨테이너)와 `completedCount` 파생값, `useEffect([completedCount])`로 completed 증가 시점에만 `scrollTo({top: scrollHeight, behavior: "smooth"})`. R4 노트 패널과 같은 로컬 ref + 상태 전환 effect 패턴, 전역 state 미추가. FinalAnswer·노트 저장·completed 전환은 useChatWorkspace의 같은 갱신에서 일어나므로 스크롤 시점에 FinalAnswer 카드가 이미 DOM에 존재
  - typecheck/lint/build 통과, 브라우저(happy-path·recheck-path): completed 시 FinalAnswer 하단+재활성 입력창 노출·이후 위 스크롤 유지(scrollTop 0, 2초 후 유지)·recheck 재검토 흐름 회귀 확인. 토스트 자동 소멸은 자동화 창 비포커스 타이머 pause로 시각 포착 대신 코드 계약으로 확정

- **SPEC-UI-001 완료 (2026-07-18)** — 사용자 수동 확인 체크리스트(R1~R5 반영분, 8항목: 팝업 3열·토스트 2초 소멸·completed 하단 이동·재검토 버튼 고정·FinalAnswer 접이식·노트 개조식/시간순/하단 유지·↗ 이동·답변 보기 버튼 테두리) 전부 통과. Spec 상태를 완료로 변경 (index.md 갱신)
  - 잔여 기록: qa-reviewer MINOR 1건(provider `as` 캐스팅)은 T-011에서 해소 예정

- **T-011: SPEC-SCHEMA-001 공통 Zod 계약 완료 (2026-07-18)** — `packages/shared`(@decision-log/shared) 신설, Web이 계약을 import
  - AC1: `packages/shared` workspace 신설(런타임 의존성 zod ^4.4.3 하나, apps/api와 동일 major hoist), 루트 `package-lock.json` 단일 유지. source-only export(`exports: ./src/index.ts`)로 vite 번들·`tsc -b` 타입검사 양쪽 충족
  - AC2: Enum 6종·엔티티 스키마 6종·StructuredContent 골격(sectionId 필수)·에러 코드 레지스트리 5종(UNKNOWN_ERROR 포함) 작성, 타입 전부 `z.infer` export. UUID=`z.uuid()`, 날짜=ISO 문자열(`z.iso.datetime`), `?`=`.nullable()`
  - 6장 교차 필드 정합 `superRefine`: Agenda(passed/rejected↔resolutionReason, passed→selectedContent), SourceAnswer(failed→errorCode, succeeded→structuredContent, excluded→excludedAt)
  - AC3: shared는 React/Express/Supabase/AI SDK 미의존 + `lib:["ES2022"]`(DOM 제외)로 브라우저 API 미의존을 타입 수준 강제
  - AC4: `features/chat/types.ts`를 shared `z.infer` 교차 타입으로 대체. 중첩 집합체 뷰(Chat→questions→sourceAnswers/agendas/finalAnswer)는 UI 전용 파생으로 유지(평면 엔티티 재정의 없음). 필드명 계약 통일(content→message, sequence→sequenceNumber), DecisionNote `seq·sources` 제거(2-1), provider `as` 캐스팅 3곳 제거, `Agenda.recheckResult` string→unknown 전환(`agendaRecheckText` 헬퍼로 표시·채택 시 문자열 좁힘)
  - AC5: `mockValidation.ts` — 반환 직전 구성 엔티티를 각 스키마로 개별 parse(중첩 배열 제외·재귀 검증, Spec 246행). `useChatWorkspace`가 상태 변경 시 검증. Mock 데이터 정합: SourceAnswer `model`(mockModelByProvider)·타임스탬프·structuredContent 채움, scenarios 첫 실패 이벤트에 errorCode 부여, 레지스트리 밖 `PROVIDER_RATE_LIMITED`→`PROVIDER_ERROR` 교체
  - AC6: 검증 실패 시 기존 error UI(.excluded-banner) 재사용 배너(`MockValidationBanner`)에 `SCHEMA_VALIDATION_FAILED` + Zod 원문 표시 + `console.error`. 고의 파손(model="")으로 배너 노출 확인 후 원복
  - AC7: 루트 `typecheck`/`lint`/`build` 통과(web `tsc -b`가 shared 소스까지 검사, vite가 shared 소스 번들)
  - AC8: 브라우저 회귀 — happy-path(SourceAnswer 순차→Agenda→충돌해소→FinalAnswer→노트)·all-rejected(고정 문구)·provider-excluded(제외 배너)·context-next-question(초기 완료 Chat+노트) 정상, 정상 시 검증 배너 미표시
  - 후속: `sourceRefs`/`recheckResult` 정식 모양·stance 계약 승격은 SPEC-AI-002, StructuredContent 확장은 SPEC-AI-001, snake_case 변환·DB 응답 검증은 SPEC-DB-001, API 봉투·요청 검증은 API Spec
  - 마무리 확인 (2026-07-19): recheck-path 브라우저 회귀 통과 — 재검토 요청→"재검색 중"→재검색 결과 박스에 `recheckResult` 정상 렌더(`unknown` 전환 후 `agendaRecheckText`로 문자열 좁힘, 렌더 깨짐 없음)→[이 결과로 결정]으로 `user_accepted_after_recheck` 채택→FinalAnswer·노트 생성. 검증 배너 미표시·콘솔 오류 없음. recheck 경로 수정 사항 없음(코드 정합)
  - qa-reviewer 판정 **전체 PASS** (BLOCKER 0·MAJOR 0): AC1~AC5·AC7 코드·실행 증거 PASS(typecheck/lint/build 재실행 성공, `as Provider`·`seq`/`sources`·`content`/`sequence` 잔재 0건, errorCode 레지스트리 밖 값 0건, superRefine 5규칙·스키마 표 일치). AC6·AC8은 QA 환경 브라우저 부재로 QA는 미실측(MINOR/NOT VERIFIED)이나 메인 세션 브라우저에서 실측 완료(AC6 고의 파손→배너→원복, AC8 4개 시나리오 회귀). 기존 범위 제한(`npm run lint`가 web만 검사)은 이번 변경 결함 아님

- **SPEC-SCHEMA-001 완료 (2026-07-18 구현, 2026-07-19 QA PASS)** — Spec 상태·index.md를 완료로 변경. 공통 Zod 계약이 packages/shared에 확정되어 이후 API·DB·AI Spec이 같은 계약을 재사용한다

- **T-012: SPEC-AUTH-001 회원가입·로그인 UI 구현 (2026-07-19)** — React Router 도입 + Supabase Auth 연결 UI. 서비스 데이터는 여전히 Mock
  - 패키지(Spec 5장 승인): `react-router`(^8.2.0)·`@supabase/supabase-js`(^2.110.7)를 apps/web에 설치, 루트 단일 lock 유지. web이 직접 쓰는 `zod`(^4.4.3)도 web deps에 명시(phantom dep 제거)
  - 라우팅(2장): `main.tsx`에 `AuthProvider`+`BrowserRouter` 도입, `App.tsx`를 라우터 루트로 전환(`/login`·`/signup`·`/verify-email`·`/`, `*`→`/login`). 기존 워크스페이스는 `WorkspacePage.tsx`로 분리해 `/`에 `RequireAuth`로 감쌈. 비로그인 `/` 진입→`/login`(초기 세션 1회 확인 수준, 가드 고도화는 SPEC-AUTH-002)
  - Supabase(5장): `lib/supabase.ts`에서 클라이언트 1회 생성 + env Zod 검증. 미설정 시 throw 없이 `supabase=null`+`isSupabaseConfigured=false`로 두어 화면·검증은 동작(콘솔 경고). 컴포넌트는 SDK 직접 호출 없이 `features/auth/authService.ts`(signUp/signIn/signOut/resend·getInitialSession)·`useAuth`·`useResendCooldown` 경유
  - 회원가입(3장): 이메일/비번/확인 inline 검증(`validation.ts` Zod: 형식·8자·일치)→`signUp(emailRedirectTo=origin+/login)`→`/verify-email` 안내(가입 이메일 표시·재발송·로그인 링크). 자동 로그인 없음
  - 로그인·로그아웃(4장): 실패 시 미인증(email_not_confirmed) 에러만 "이메일 인증을 완료해주세요"+재발송, 그 외 Supabase 원문(콘솔 기록). 좌측 패널 하단 로그인 이메일+[로그아웃]→확인 팝업(Astryx Dialog)→확인 시 signOut+`/login`. ChatListPanel이 mockUser 대신 session.email·onLogout props 사용
  - 상태·오류(6장): 폼별 idle/loading/error, 재발송 30초 쿨다운(`useResendCooldown`). AuthContext는 마운트 시 getInitialSession 1회만(onAuthStateChange 구독·토큰갱신은 002)
  - 문서: `.env.example`(Supabase 주석)·`.gitignore`(.env 명시 차단)·`dev-setup.md`(Supabase 대시보드 체크리스트: Email·Confirm ON·최소 8자·Site/Redirect URL /login) 갱신
  - 검증: 루트 `typecheck`/`lint`/`build` 통과. 브라우저 실측 — AC1(4라우트·`/`→`/login` 리다이렉트), AC2(회원가입 3필드 inline 에러·제출 차단), AC6(로그아웃 확인 팝업→`/login`), AC8(RequireAuth 임시 우회로 `/` 진입→질문→SourceAnswer→Agenda 충돌 2건 해소→FinalAnswer·DecisionNote 생성→컴포저 재활성, 회귀 없음. 검증 후 우회 원복 확인). 콘솔은 예상된 미설정 경고만
  - **미확인(사유): AC3·4·5는 Supabase 프로젝트 미연결로 실측 불가.** 코드 경로는 완성. `.env.local` 채우고 대시보드 설정(dev-setup 체크리스트) 후 실측 예정
  - lint 주의: `react-refresh/only-export-components` 때문에 AuthContext(컴포넌트)와 useAuth 훅/컨텍스트를 `useAuth.ts`로 분리
  - 후속: 세션 복원·토큰 갱신·라우트 가드 고도화(SPEC-AUTH-002), Express JWT 검증(SPEC-AUTH-003), 비밀번호 재설정(SPEC-AUTH-004), 에러 한국어 매핑(배포 전), 서비스 데이터 사용자별 저장(SPEC-DB-001)

- **T-012 사후 실측: SPEC-AUTH-001 AC3·4·5 (2026-07-20)** — Supabase 실연결(`.env.local`+대시보드) 후 라이브 측정. 코드 변경 없음(측정·문서만). 메일 예산 2통(가입1+재발송1) 준수
  - AC5 PASS: 미가입 계정 로그인 → Supabase 원문 "Invalid login credentials" 배너 표시(미인증 전용 안내 아닌 원문 경로). 메일 0
  - AC3 PASS: 가입 POST `/auth/v1/signup?redirect_to=…/login` 200(메일 #1) → `/verify-email`이 가입 이메일 표시 → 재발송 POST `/auth/v1/resend` 200(메일 #2) + "다시 보냈습니다" 안내·30초 쿨다운(연타 방지) → 사용자가 인증 링크 클릭 → `email_confirmed_at` 설정 확인(계정 확인 완료)
  - AC4 후반 PASS: 확인 완료 계정 로그인 POST `/auth/v1/token?grant_type=password` 200 → `/` 워크스페이스 열림, 좌측 하단 실제 로그인 이메일(`session.email`) 표시. 리로드 시 localStorage 세션 복원(RequireAuth 통과, /login 리다이렉트 없음)
  - **AC4 전반 미확인(사유)**: 사용자가 인증 링크를 조기 클릭(가입 16초 후 `email_confirmed_at`=`created_at`+16s)해 계정이 즉시 확인 완료 → 미인증 로그인 상태를 재현할 수 없어 "이메일 인증을 완료해주세요"+재발송 분기 라이브 측정 불가. 신규 계정 생성은 메일 예산 소진으로 보류. `email_not_confirmed` 분기·전용 안내·재발송 코드는 T-012에서 확인됨. 사용자 결정: 미확인+사유로 기록(추가 메일 미발송). 신규 이메일 또는 대시보드 미인증 계정으로 재측정 예정
  - 콘솔: 인증 흐름 전반에서 예상 외 오류·경고 없음. 세션 사용자 정보는 auth feature 내부에서만 다룸(서비스 계약 미포함)
  - 테스트 계정 비밀번호는 채팅으로만 공유하고 문서·커밋·로그에 남기지 않음
  - Spec 7장 AC3·4·5 체크박스 갱신(AC4는 `[~]` 부분 확인). 상태 헤더·index.md는 유지(완료 처리는 Cowork 담당)

- **SPEC-AUTH-001 완료 (2026-07-20)** — T-012 구현 + Supabase 실측(AC3·AC5·AC4 후반 PASS)으로 완료 처리. AC4 전반(미인증 로그인 안내 라이브 측정)만 미확인+사유로 남기고, SPEC-AUTH-002 실측에서 Gmail `+별칭` 신규 계정으로 재측정한다(사용자 결정). Spec 상태 헤더·개정 기록·index.md 갱신 (Cowork)

- **T-013: SPEC-AUTH-002 세션 복원·라우트 가드 (2026-07-20)** — auth 상태 관리를 "마운트 1회 확인"에서 `onAuthStateChange` 구독으로 전환. 새 패키지 없음. 1차(AC5 메일 실측 제외, 메일 0통)
  - 2장(구독 전환): `authService.subscribeToAuthChanges(onChange)` 신설 — `onAuthStateChange` 캡슐화, `Session`→`AuthSession` 정규화, 미설정 시 `INITIAL_SESSION`(null) 1회 통지 후 no-op 해지. `AuthProvider`가 마운트 시 구독/언마운트 해지, 초기 세션은 구독의 INITIAL_SESSION으로 확인(`getInitialSession` 제거). 토큰 자동 갱신은 Supabase 기본(autoRefreshToken)
  - 직접 로그아웃 구분: `authService` 모듈 플래그 `intentionalSignOut`(`signOut()`이 세움, `consumeIntentionalSignOut()` 소비). SIGNED_OUT이 직접 로그아웃이면 안내 없음, 그 외(만료·타 탭)면 `sessionExpired=true`
  - 3장(역방향 가드): `RedirectIfAuthenticated` 신설 — 로그인 상태의 `/login`·`/signup` → `/`. `/verify-email` 제외. App에서 두 라우트만 감쌈. RequireAuth·스피너 유지
  - 4장(만료 안내): `useAuth`에 `sessionExpired`+`clearSessionExpired` 추가. LoginPage가 폼 위 Banner "세션이 만료되었습니다. 다시 로그인해주세요" 표시, 언마운트 시 clear(잔존 금지). SIGNED_IN/INITIAL_SESSION에서 자동 해제
  - 유지(과도한 리팩터링 금지): LoginPage `setSession`+navigate, WorkspacePage `clearSession`+navigate는 구독과 idempotent하고 네비게이션 레이스를 피하므로 그대로. 세터는 `useCallback`으로 안정화
  - 검증: 루트 `typecheck`/`lint`/`build` 통과. 브라우저 실측 — AC2·AC3·AC4·AC6 PASS, AC1 대체 측정 PASS(새 탭/리로드 복원; 완전 종료는 수동 확인 항목), AC5는 2차 실측 예정(메일 미발송). 콘솔 예상 외 오류 없음
    - AC4 재현: localStorage 세션 `expires_at` 과거·`refresh_token` 무효화 → 리로드 → 갱신 실패 → `/login`+만료 배너, 재리로드 시 배너 소멸. 직접 로그아웃(탭)에는 배너 미표시
    - AC3: 탭 2개 로그인 → 한 탭 로그아웃 → 다른 탭 즉시 `/login` 이동
  - 로그인 실측은 기존 인증 완료 계정(lymsla0117@gmail.com) 사용, 비밀번호는 채팅으로만 받아 이 로그인에만 사용(문서·커밋·로그 미기록)
  - Spec 6장 AC 체크박스 갱신(AC1=`[~]`, AC5 2차 예정). 상태 헤더·index.md는 유지(완료 처리는 Cowork 담당)

- **T-013 2차 실측: SPEC-AUTH-002 AC5 = SPEC-AUTH-001 AC4 전반 (2026-07-20)** — Gmail `+별칭` 신규 계정으로 미인증 로그인 안내 라이브 측정. 코드 변경 없음(실측·문서만). 메일 1통(가입)만 발송
  - AC5 PASS: 신규 계정 `lymsla0117+t013@gmail.com` 가입 POST `/auth/v1/signup?redirect_to=…/login` **200**(메일 1통, 발송 제한 에러 없음) → `/verify-email` 안내(가입 이메일 표시·재발송 버튼·로그인 링크). 인증 링크 미클릭(미인증 유지) 상태로 `/login` 로그인 시도 POST `/auth/v1/token?grant_type=password` **400** → 폼 아래 "이메일 인증을 완료해주세요" 경고 배너 + 펼치면 "가입 시 보낸 인증 메일의 링크를 클릭한 뒤 다시 로그인해주세요" + [인증 메일 재발송] 버튼 표시. 재발송·인증 링크 클릭 안 함(메일 추가 발송 0)
  - AC1 사용자 수동 확인 완료: 같은 Chrome 프로필에서 완전 종료 후 재접속 시 로그인 유지 PASS → Spec 6장 AC1을 `[x]`로 승격(자동화 대체 측정 + 수동 확인, 동일 프로필 조건)
  - 겸사 관찰(수정 불요): 탭 2개 로그인 후 한 탭 직접 로그아웃 시 다른 탭도 즉시 `/login` 이동, 이때 다른 탭에는 **만료 배너 없음**(깨끗한 로그인 폼). Spec 4장 탭 간 문구 구분 = 구현 재량이며 현재 구현은 배너 미표시 쪽
  - 문서: SPEC-AUTH-002 6장 AC5=`[x]`(+AC1=`[x]` 반영·범례 정리), SPEC-AUTH-001 7장 AC4=`[x]`(전반·후반 PASS 확정, `[~]`·하단 문구 정리). 상태 헤더·index.md는 유지(완료 처리는 Cowork 담당)
  - 로그인이 필요한 겸사 관찰은 사용자가 인증 완료 계정으로 직접 로그인해둔 세션 사용(비밀번호 미노출). 테스트 계정 비밀번호는 채팅으로만 공유, 문서·커밋·로그 미기록

- **SPEC-AUTH-002 완료 (2026-07-20)** — T-013 구현 + 실측으로 AC1~AC6 전 항목 PASS. onAuthStateChange 구독 기반 세션 복원·토큰 갱신·역방향 가드·만료 안내·탭 동기화 확정. 상태 헤더·개정 기록·index.md 갱신 (Cowork)
- **SPEC-AUTH-001 최종 완료 (2026-07-20)** — AC4 전반이 T-013 2차 실측에서 PASS 확정되어 AC1~AC8 전 항목 완료. 상태 헤더·개정 기록·index.md 갱신 (Cowork). 인증 파트(가입·로그인·세션·가드)가 실제 Supabase 연동으로 전부 닫힘

- **SPEC-AUTH-003 작성 완료 (2026-07-20, Ready)** — 사용자가 AUTH-003을 다음 순서로 선택. Step 1~3 확정: JWT 검증=`supabase.auth.getUser`(공개 키만), 테스트 엔드포인트 `GET /api/auth/me`, 얕은 프론트 ApiClient, 코드+원문 에러 봉투를 `packages/shared` 프로젝트 표준으로 착수. 추가 패키지 `@supabase/supabase-js`(apps/api). AC1~7 확정 — 다음: T-014 구현

- **AI 키 모델 결정 (2026-07-20 — SPEC-AI-001·DB-001·설정 Spec에서 정식화)** — BYOK 채택 + **하이브리드**: 기본 앱 키로 즉시 체험 + 사용자별 키 선택 입력. Provider는 "사용자 키 있으면 그것, 없으면 앱 키" 순 조회
  - **앱 기본 키 사용 여부는 전역 on/off 플래그(예: API env `APP_DEFAULT_AI_KEYS_ENABLED`)로 Brett이 제어** — 어드민 UI 없이 config 수정+재시작 수준이면 충분. 데모·심사 땐 ON, 평소 OFF로 무분별 사용 차단. 기본 키는 이미 로그인+이메일 인증 뒤에 있고 사용량 제한 병행 가능(플래그 default 값은 AI-001에서 결정)
  - 사용자 키는 백엔드 암호화 저장(프론트·로그·에러 노출 금지, custodian 보안 강화). 키 입력·검증 화면은 별도 소형 Spec 후보(SPEC-SETTINGS-001)
  - **개정 필요 확정 문서(정식화 시)**: CLAUDE.md 2장(AI 키 env-only→사용자별 암호화 저장 허용), data-model(사용자별 키 테이블), 새 ADR(키 저장·암호화 방식), domain-policy(키 미입력 시 Provider 처리), dev-setup
  - 순수 BYOK(앱 키 없음) 대비 데모 마찰을 없애려고 하이브리드 선택 (사용자 결정, 대안 비교 후)

- **T-014: SPEC-AUTH-003 구현 완료 (2026-07-20)** — Express Auth Middleware + `/api/auth/me` + 에러 봉투(shared) + 프론트 ApiClient. AC1~AC7 실측 PASS. (상태 헤더·index.md는 유지 — 완료 처리는 Cowork 담당)
  - 2장(인증 경계): `apps/api/src/shared/config/env.ts`(서버 시작 시 `SUPABASE_URL`·`SUPABASE_PUBLISHABLE_KEY` Zod 검증, 키 값 미노출), `shared/supabase/supabaseClient.ts`(URL+Publishable 공개 키로 1회 생성, `persistSession/autoRefreshToken=false`, 토큰 검증 전용), `modules/auth/auth.middleware.ts`(`requireAuth`: Bearer 파싱→`supabase.auth.getUser`→검증 사용자만 Zod로 좁혀 `req.auth={userId,email}`), `me.controller.ts`(`req.auth`만 반환), `auth.route.ts`(`GET /me`), `auth.types.ts`(Express `req.auth` 선언 병합 + `AuthenticatedRequest`). `app.ts`에 `/api/auth` 연결(`/api/health` 인증 없이 유지), `server.ts`가 기동 시 `loadEnv()` 검증 실패 시 `exit(1)`
  - 3장(에러 봉투): `packages/shared/src/schemas/responseEnvelope.ts` — `ErrorEnvelopeSchema {error:{code,message}}`·`AuthErrorCode`(`UNAUTHENTICATED`·`TOKEN_INVALID`)·`AuthMeResponseSchema`. api가 생성(`shared/http/errorEnvelope.ts`가 shared 스키마로 재검증), web이 파싱. code는 열린 string(후속 코드 확장 시 web 파싱 미파손), message에 Supabase 원문 담되 비밀값·토큰·스택 제외
  - 4장(ApiClient): `apps/web/src/lib/apiClient.ts` — `VITE_API_BASE_URL` 기준, `authService.getAccessToken()`(신규, 세션 access_token 캡슐화)로 Bearer 첨부, `fetchAuthMe()` 경로 1개, 응답을 shared 성공 스키마·에러 봉투로 파싱(401 분기). `AuthContext`가 세션 userId 확립 시 1회 `fetchAuthMe`로 서버 신원 대조·로깅(버려지는 코드 아님, 이후 데이터 로딩 경로가 재사용)
  - 5장(패키지·문서): `@supabase/supabase-js`(^2.110.7)+`@decision-log/shared`를 `apps/api`에 추가, 루트 단일 lock 유지(설치 후 lock 1개 확인). `apps/api/.env.example` 주석 정리(URL·Publishable=필수 검증, Secret=DB Spec). `dev-setup.md`에 API env·JWT 검증(getUser)·supabase-js 패키지 반영
  - shared 소비 조정(필요·최소): api(NodeNext)가 shared를 처음 소비하며 `index.ts`·스키마 파일의 확장자 없는 상대 import가 해석 실패 → shared 내부 상대 import에 `.js` 부여(bundler=web·NodeNext=api 양쪽 호환). web typecheck/lint/build 회귀 없음
  - 검증: 루트 `typecheck`·`build` 통과. `lint`는 web만(apps/api에 lint script 없음 — AC7 명시). AC1~AC7 실측 PASS(아래)
  - **AC1**(env 검증): tsx 런타임에서 `SUPABASE_URL=`/`SUPABASE_PUBLISHABLE_KEY=` 빈 값 기동 → `[api] 서버 환경변수 검증 실패 … [SUPABASE_URL: …; SUPABASE_PUBLISHABLE_KEY: …]` 명확한 메시지·`exit 1`, **키 값 미노출**(키 이름·검증 메시지만). 복구 후 정상 기동 `Decision Log API running at :4000`
  - **AC2·AC3**(curl): `/api/auth/me` 무토큰→`401 UNAUTHENTICATED`, `Bearer` 형식 오류→`401 UNAUTHENTICATED`, 깨진 토큰→`401 TOKEN_INVALID`(message=Supabase 원문 "invalid JWT: … token is malformed …", 비밀값·토큰 없음). 유효 세션 토큰→`200 {userId:ee54188d…, email:lymsla0117@gmail.com}`
  - **AC4**(위조 userId 무시): 로그인 브라우저에서 `/api/auth/me?userId=<위조>` + `X-User-Id:<위조>` 주입 → 반환 userId는 세션 JWT의 `ee54188d…`(위조값 아님, `ignoresForged:true`)
  - **AC5**: 에러 봉투 스키마가 `packages/shared`에 있고 api 생성·web 파싱(401 봉투 정상 파싱). 성공 봉투는 `/api/auth/me` 최소 형태만, 표준 확장 여지는 Spec 3·8장에 문서화
  - **AC6**(ApiClient): 리로드 시 AuthContext `fetchAuthMe`가 Network에 `GET /api/auth/me`(선행 OPTIONS 204 preflight)→`200`, 콘솔 `[apiClient] /api/auth/me OK — 서버 신원 일치 (userId=ee54188d…)`. 무토큰 fetch→`401 UNAUTHENTICATED` 경로 확인
  - **AC7**: web happy-path 회귀 — 로그인 상태에서 질문 입력→SourceAnswer 처리→Agenda(충돌 2 + 자동 통과 1)→충돌 2건 채택→FinalAnswer(공통 권장/결정 사항/본문/출처)→DecisionNote 생성→컴포저 재활성·● 제거. `/api/health` 200 회귀 정상. 콘솔 예상 외 오류 없음
  - **환경 수정(비-코드)**: `apps/api/.env`의 `SUPABASE_URL` 값에 붙여넣기 오타(`SUPABASE_URL=UPABASE_URL=https://…`)가 있어 z.url 검증 실패 → 중복 접두사 제거해 `https://…supabase.co`로 교정(gitignore 대상, 커밋 안 됨). web `.env.local`과 동일 프로젝트·동일 Publishable Key 확인
  - **알려진 제한(후속)**: `packages/shared`는 빌드 산출물 없는 소스 전용(exports=`src/index.ts`)이라, 컴파일된 `node dist/server.js`는 shared의 `.js` 지정자를 `.ts`로 해석 못 해 실행 불가. 개발 런타임(`npm run dev:api`=tsx)·web(Vite)은 정상. 프로덕션 `node dist` 실행이 필요해지면 shared 빌드 단계 또는 api 번들링을 도입해야 함(이번 Spec 범위 밖, 배포 Spec에서)
  - 실측용 로그인은 인증 완료 계정(lymsla0117@gmail.com), 비밀번호는 채팅으로만 받아 이 로그인에만 사용(문서·커밋·로그·메모리 미기록)

- **SPEC-AUTH-003 완료 (2026-07-20)** — T-014 구현 + AC1~AC7 실측 PASS로 완료 처리. Cowork가 Spec 상태 헤더·개정 기록·index.md 갱신. 인증 경계(JWT 검증·`/api/auth/me`·에러 봉투·ApiClient)까지 서버에 섬. 알려진 제한: `packages/shared`가 소스 전용이라 `node dist` 프로덕션 실행 불가(개발 런타임·web은 정상) — 배포 Spec에서 shared 빌드/번들 도입 필요 → **T-014.1에서 해소**

- **T-014.1: packages/shared 빌드 산출물 도입 (2026-07-20)** — 인프라 태스크(새 기능 없음). SPEC-AUTH-003 "알려진 제한" 해소 + SPEC-SCHEMA-001 AC1 "소스 전용 export" 결정의 실질 개정(Spec 문서 개정은 Cowork 담당 — 여기선 변경 사실만 기록)
  - `packages/shared/tsconfig.json`: 방출 활성화 — `noEmit` 제거, `outDir:dist`·`rootDir:src`·`declaration:true`·`sourceMap:true`. `module/moduleResolution`을 `bundler`→**`NodeNext`**(Node 소비용 자기일관 emit, 소스의 `.js` 지정자와 정합). `lib:["ES2022"]`(DOM 미포함)·`verbatimModuleSyntax`·`strict` 유지, `exclude`에 `dist`
  - `packages/shared/package.json`: `exports."."`를 조건부로 — **`types→./src/index.ts`**(타입검사는 소스 그대로 = 현재와 동일, 빌드 없이 typecheck 통과), **`import/default→./dist/index.js`**(런타임=빌드 JS). `main→./dist/index.js`. 스크립트 `build:"tsc -p tsconfig.json"` + **`prepare:"npm run build"`**(`npm install` 시 dist 자동 생성 → dev·typecheck 무회귀). deps는 zod 그대로(프레임워크 의존 0 유지)
  - 루트 `package.json`: `build`를 **순서 보장**으로 — `shared → api → web` 명시 실행(shared dist가 api·web 빌드 전 존재). `build:shared` 헬퍼 추가(shared 소스 수정 후 재빌드용)
  - 소스 파일·`.js` 지정자·계약 내용 **불변**(export 방식·빌드 설정만 변경). `development` 등 개발 전용 export 조건은 미추가(과설계 금지 — dist 지정 + prepare로 충분)
  - **검증 전부 PASS**: 루트 `typecheck`(shared·api·web) 통과, 루트 `build`(shared→api→web) 통과. **`node apps/api/dist/server.js`**(env 채운 상태) → `Decision Log API running at :4000` 정상 기동 + `/api/health` 200(배포 가능성 실증). `npm run dev`(web :5173 + api :4000 tsx) 정상. web happy-path 1회 회귀(질문→SourceAnswer→Agenda 충돌 2 채택→FinalAnswer→DecisionNote→컴포저 재활성) 정상, 콘솔 오류 없음. `lint`는 web만(apps/api lint script 없음 — 미검사)
  - `prepare`가 `npm install` 시 dist를 만들어 첫 `dist/index.js`·`index.d.ts` 자동 생성 확인. `packages/shared/dist`는 기존 `.gitignore`의 bare `dist` 규칙으로 이미 무시됨(`git check-ignore` 확인) — 중복 엔트리 미추가
  - 남는 dev 특성(회귀 아님): shared 소스를 편집하면 web dev(Vite)·api dev(tsx) 모두 dist를 참조하므로 `npm run build:shared`(또는 install)로 재빌드 필요. shared는 안정 계약이라 빈도 낮음

- **순서 변경 결정 (2026-07-20)** — 사용자가 AI-001 대신 **DB-001 먼저** 선택. 이유: 영속성이 토대, BYOK 사용자 키 저장이 DB 필요, AUTH-003 다음 자연스러운 서버 경계. 새 순서: AUTH-003(완료) → **DB-001** → AI-001~003 → EXPORT-001

- **SPEC-DB-001 작성 완료 (2026-07-20, Ready)** — Step 1~4 확정 + 스키마 7테이블 상세 검토(사용자 필드 단위 컨펌). 범위=토대 전체(스키마·RLS·2-클라이언트)+Chat·Question 실저장, AI 생성물 저장은 각 AI Spec. BYOK 키 테이블 포함, 앱 레벨 AES-256-GCM, 계정 삭제=RESTRICT 유지
  - **스키마 검토 중 확정된 추가/변경** (data-model.md 갱신 반영):
    - **값 부재 표현 규칙 (1.6, 별도 커밋)**: `null`=값 없음/미상 vs `NO_VALUE`(예약어)=의도적 없음. 외부 응답은 Zod 경계에서 정규화, 원문은 raw_content 보존. CLAUDE.md 5장 포인터 + `packages/shared` 상수(코드는 구현 때)
    - **agendas 신규 필드 2종**: `selected_source_ref`(채택 출처 참조 / NO_VALUE / null 3상태) · `prompt_version`(Manager 비교 프롬프트 버전). `source_refs`는 비교한 모든 근거 보존(선택된 것만 저장 금지) 명시
    - **user_provider_keys 신규 테이블**(3.8): encrypted_key·key_iv·key_auth_tag(AES-256-GCM), UNIQUE(user_id,provider), 마스터 키 env. 표시용 힌트(마지막 4자)는 설정 Spec으로 연기
  - 다음: T-015 구현

- **T-015: SPEC-DB-001 구현 완료 (2026-07-20)** — DB 마이그레이션·RLS·2-클라이언트·Chat/Question 실저장·BYOK 암호화 경로. AC1~AC6 실측 PASS. (상태 헤더·index.md는 유지 — 완료 처리는 Cowork)
  - 2장 마이그레이션: `supabase/migrations/` 3파일(init_schema·grants·next_question_rpc). Enum 6·테이블 6+`user_provider_keys`·제약(FK RESTRICT/CASCADE·UNIQUE·`message` CHECK·agenda 상태↔reason↔content↔`selected_source_ref` CHECK)·미완료 Question Partial Unique·Index·`moddatetime`(extensions) 트리거 6·전 테이블 RLS. Enum 값은 shared와 일치. Supabase CLI(Homebrew)로 `db push --db-url`(apps/api/.env)
    - **GRANT 마이그레이션 추가(발견)**: RLS만으론 부족 — 마이그레이션 생성 테이블에 `authenticated`·`service_role` 테이블 DML GRANT가 없어 `permission denied`. `grants.sql`로 GRANT + default privileges 부여(RPC insert·admin 접근 정상화)
  - 3장 암호화: `keyCipher`(AES-256-GCM, 마스터 키=env `AI_KEY_ENCRYPTION_KEY` base64 32바이트, IV·auth tag) + `providerKeys.repository`(암호화 저장·복호, 평문 미노출). `user_provider_keys` UNIQUE(user_id,provider)·CASCADE·RLS
  - 4장 RLS·2-클라이언트: `userClient`(요청 JWT 전달, RLS) / `adminClient`(Secret Key, 구성만 — 실사용 AI Spec). `env.ts` 확장(`SUPABASE_SECRET_KEY`·`AI_KEY_ENCRYPTION_KEY` 필수 검증, 값 미노출). Repository DB 응답 shared Zod 검증·snake↔camel. RLS 소유권=EXISTS join(하위→chats.user_id)
  - 5장 web 재배선: `apiStorageAdapter`(Promise) + apiClient chat 메서드. 엔드포인트 `POST /api/chats`(원자 RPC·title 100)·`POST /:chatId/questions`(원자 RPC seq)·`PATCH /:chatId/questions/:id`(완료 전이 — happy-path 다중 질문·복원 일관성 위해 추가한 생명주기 엔드포인트)·`GET /api/chats`·`GET /:chatId/questions`. Controller Zod, 에러=AUTH-003 봉투(`QUESTION_ALREADY_OPEN` 409 등). `useChatWorkspace`는 기본(happy-path) 시나리오에서만 서버 저장(dev `?scenario=`는 기존 Mock 유지), 마운트 시 서버 하이드레이트. **AI 파이프라인(SourceAnswer·Agenda·FinalAnswer·DecisionNote)은 브라우저 Mock 유지(0.4)** — 옛 Question은 메시지·상태만 복원
  - `NO_VALUE` 상수: `packages/shared`에 추가(1.6), `selected_source_ref` CHECK에 `'"NO_VALUE"'::jsonb`로 적용
  - **AC1**: db push 후 테이블 7·Enum 6·제약·Partial Unique·트리거 6·RLS 7·정책 20·RPC 2·`chats.user_id` FK RESTRICT psql 확인
  - **AC2**(RLS): admin API로 확인 계정 B 생성(메일 0) → **양방향 교차 차단** chats·questions·`user_provider_keys` 모두 A→B 0·B→A 0, 본인 것 조회됨. B 계정·테스트 데이터 정리(삭제)
  - **AC3**: 2-클라이언트 구성, `POST /api/chats`에 body `userId` 위조 주입해도 생성 chat 소유=검증 JWT 사용자(admin 확인), 무토큰 401
  - **AC4**(web 저장): 브라우저 로그인→질문→`POST /api/chats` 201(title 100·seq1)→충돌 해소→`PATCH` 200(완료 영속화)→리로드 시 Chat 목록·Question 복원(completed·컴포저 재활성). 미완료 1개 제약=`POST 다음 질문` 409(curl)
  - **AC5**(암호화): admin 기반 round-trip — 암호문 저장(평문 0)·복호 원문 복원·GCM 위변조 감지·anon 0행·임시 행 정리. 평문 미출력
  - **AC6**: 루트 `typecheck`·`build` 통과, `node apps/api/dist/server.js` 정상(health 200·보호 401), `lint` web만(api script 없음). 인증·happy-path 회귀 없음(브라우저), 콘솔 오류 없음
  - StrictMode 이중 마운트 하이드레이트 버그 수정(ref 가드 제거, per-run cancelled). 실측 로그인은 기존 계정(비밀번호 채팅 전용·미기록), 비밀·DB URL·키를 로그·커밋에 미노출
- **SPEC-DB-001 완료 (2026-07-22)** — T-015 AC1~AC6 실측 PASS로 완료 처리. Cowork가 Spec 상태 헤더·개정 기록·index.md 갱신. 인증·영속성 토대(스키마·RLS·2-클라이언트·Chat/Question 실저장·BYOK 암호화 경로)까지 실제 Supabase로 섬. **다음: SPEC-AI-001**(실제 3사 AI 파이프라인 — 서버 SourceAnswer 생성·정규화·저장 + web 실호출로 Mock 교체)
- **SPEC-AI-001 뼈대 작성 (2026-07-22, Ready)** — AI Provider 실호출·SourceAnswer 생성 Spec. Step 1~7 확정: 비동기+SSE·명시적 생성, 타임아웃 45초·재시도 구분(일시적+스키마실패만), 전멸=고정문구+완료, 좌초=미룸(안정화), BYOK 하이브리드(플래그 기본 ON·사전 키 점검·키 없으면 시작 차단), 관측 메타 JSONB, StructuredContent 확장(summary·order·kind 자유), provider별 프롬프트, Context=web 전달(임시→서버화 후 DB 기반). 어젠다 분류·충돌 판단 기준은 SPEC-AI-002로 명시(사용자 제기). 키 입력 UI는 SPEC-SETTINGS-001 분리. 다음: 사용자 컨펌 → T-016 구현
- **ADR-005 작성 + SPEC-AI-001 §2.3 반영 (2026-07-22)** — AI 파이프라인 모듈 경계(포트 & 어댑터). 5개 포트(ProviderClient·AnswerPromptTemplate·AnswerNormalizer·AgendaClassifier·ConflictComparator) 인터페이스 확정, **설정 선택 + 버전 스탬프**로 교체·재현. 구현은 provider/prompt/정규화=AI-001, 분류/비교=AI-002(빈 코드 없음). '프레임워크가 아니라 이음새' 원칙
- **SPEC-AI-001 완료 (2026-07-22)** — T-016.1(계약·마이그레이션·Mock)·2a(provider 포트·어댑터·정규화·프롬프트·BYOK·저장, 3사 실호출)·2b(SSE 전환·GET 복원·최소모델 고정)·3(web 재배선·SSE 구독·복원·Context·전멸) 전부 구현·실측 PASS. **실제 Claude·OpenAI·Gemini가 SSE로 스트리밍되어 브라우저에서 3사 파이프라인이 관통**(최소 모델 claude-haiku-4-5·gpt-5-nano·gemini-3.5-flash-lite). Cowork가 상태 헤더·AC·index.md 갱신. 알려진 한계(후속): Agenda 비교는 여전히 브라우저 Mock(실제 Manager=SPEC-AI-002) / 새로고침 시 Agenda·FinalAnswer·DecisionNote 미복원(서버 비영속 0.4 — AI-003·EXPORT) / SSE heartbeat·탭 이탈 취소·좌초 복구 미구현(배포·안정화) / 스트림 '재시도 중' 라벨 미표시. **다음: 배포(T-017) 또는 SPEC-AI-002(Manager)**
- **T-016.1 완료 (2026-07-22)** — SPEC-AI-001 계약·마이그레이션·Mock 반영(3단계 중 1단계, 외부 AI 호출 없음)
  - **공통 계약(§8.1)**: `packages/shared` `SectionSchema`에 `order`(정수·0 이상)·`kind`(자유 문자열, 부재 시 `null`), `StructuredContentSchema`에 `summary`(부재 시 `null`) 추가. 기존 `sectionId`/`title`/`content`와 `SourceAnswerSchema` superRefine 3종은 무변경
  - **마이그레이션(§8.3)**: `20260722120000_source_answers_response_meta.sql` — `source_answers.response_meta jsonb NOT NULL DEFAULT '{}'`. `model`·`prompt_version`·`started_at`·`completed_at`은 기존 칸 유지(추가 컬럼 없음). RLS(행 단위)·GRANT(테이블 단위 + default privileges)는 컬럼 추가 영향 없어 변경 불필요 — psql로 확인만
  - **Mock 반영**: 18개 Section(3사×6)에 `order`·`kind` 부여, `mockSummaryByProvider` 신설로 `useChatWorkspace` 2곳의 `structuredContent`에 `summary` 주입. **스키마를 느슨하게 풀지 않고 Mock을 계약에 맞춤**
  - **검증**: 루트 `typecheck`·`lint`·`build`(shared→api→web 순서) 통과. psql로 `response_meta` 컬럼·마이그레이션 이력·RLS 정책 3개·GRANT 확인. 브라우저 회귀 happy-path(FinalAnswer·DecisionNote까지)·provider-excluded(제외 배너)·all-rejected(고정 문구+노트) 정상, 검증 배너 미표시·콘솔 오류 없음
  - **미확인**: `supabase db push` CLI 프로세스가 적용·이력 기록 후 2분 타임아웃으로 잘려 CLI 완료 메시지는 못 봄(결과는 psql로 직접 확인). `recheck-path`·`context-next-question` 시나리오는 미실행
  - **다음**: T-016.2 — 외부 AI SDK 설치, provider 계층·포트(ProviderClient·AnswerPromptTemplate·AnswerNormalizer), `response_meta` Zod 계약·실제 기록, 서버 저장. `SPEC-SCHEMA-001` 5.3.1·개정 기록 반영은 Cowork 담당
- **T-016.2a 완료 (2026-07-22)** — SPEC-AI-001 서버 Provider 파이프라인 코어(실호출·정규화·저장, 동기 엔드포인트). SSE·GET 복원·web 재배선은 T-016.2b/.3
  - **계약**: `packages/shared`에 `ResponseMetaSchema`(inputTokens·outputTokens nullable, latencyMs) + `SourceAnswerSchema.responseMeta` 추가. web Mock은 관측값이 없으므로 `null`
  - **패키지**: `apps/api`에 `@anthropic-ai/sdk@0.112.5`·`openai@6.48.0`·`@google/genai@2.13.0` 설치. 루트 `package-lock.json` 단일 유지
  - **포트·어댑터(ADR-005)**: `apps/api/src/modules/sourceAnswers/`에 `ProviderClient`+레지스트리(45초 타임아웃·에러 5종 매핑), claude·openai·gemini 어댑터, `AnswerNormalizer`(raw→StructuredContent, 실패=SCHEMA_VALIDATION_FAILED), `AnswerPromptTemplate`
  - **프롬프트**: 루트 `/prompts/answer/{claude,openai,gemini}/v1.md` — **런타임에 읽는 텍스트 템플릿**(재빌드 없이 교체). 경로는 `ANSWER_PROMPTS_DIR`(기본값이 dev·dist 모두 루트 `/prompts`로 해석), 사용 버전은 `prompt_version`에 스탬프
  - **BYOK(7장)**: 사용자 키 → 앱 키(`APP_DEFAULT_AI_KEYS_ENABLED`, 기본 ON) 순. 사전 점검에서 하나라도 없으면 저장 없이 `NO_AVAILABLE_KEYS` 거절
  - **저장(ADR-002)**: Service가 검증 JWT userId로 소유권 확인 후 adminClient로 시스템 쓰기. pending→processing→succeeded/failed, raw·structured·response_meta·model·prompt_version·타임스탬프 기록. 오케스트레이션은 `req`/`res`를 모르고 `onUpdate` 콜백만 있어 2b에서 SSE로 감쌀 수 있음
  - **엔드포인트**: `POST /api/chats/:chatId/questions/:questionId/source-answers`(requireAuth) — 저장 완료 후 `SourceAnswer[]` 반환. 2b에서 같은 URL을 SSE로 전환
  - **검증**: 루트 `typecheck`·`lint`·`build`(shared→api→web) 통과. 실호출 실측 — claude `succeeded`(5 sections·summary·meta 22.8s), gemini `succeeded`(4 sections, **retry_count=1**로 재시도 정책 실증), openai `failed`+`excluded`(HTTP 429). psql로 `order`·`kind`(자유 문자열)·`summary`·`response_meta`·`prompt_version`·`model` 저장 확인. `NO_AVAILABLE_KEYS` 400(플래그 OFF), 미소유 Question 404, 무토큰 401, body `userId` 위조해도 소유권=JWT 확인
  - **환경 이슈(코드 아님)**: `.env`의 **OpenAI 키가 크레딧 소진(insufficient_quota)** 상태라 OpenAI만 계속 실패한다. 덕분에 부분 실패 경로(6.1)는 실증됐지만, 3사 전원 성공은 결제 복구 후 재확인 필요
  - **모델 기본값**: `CLAUDE_MODEL=claude-opus-4-8`, `OPENAI_MODEL=gpt-5`, `GEMINI_MODEL=gemini-3.5-flash`(2.5-flash는 신규 사용자 지원 종료). Claude가 45초 예산에 근접(39초)해 프롬프트에 분량 제약(섹션 3~5개)을 넣어 23초로 낮춤
  - **남은 문제**: 새 env 6종(`ANTHROPIC_API_KEY`·`OPENAI_API_KEY`·`GEMINI_API_KEY`·`APP_DEFAULT_AI_KEYS_ENABLED`·프롬프트/모델 선택키)이 `docs/dev-setup.md`에 아직 없음. 실측용 테스트 Chat 2건이 DB에 남아 있음(미완료 Question 포함 → 해당 Chat에서만 새 질문 차단)
  - **다음**: T-016.2b — SSE 전환 + `GET .../source-answers` 복원 엔드포인트
- **T-016.2b 완료 (2026-07-22)** — SPEC-AI-001 source-answers SSE 전환 + GET 복원. web 재배선은 T-016.3
  - **이벤트 계약**: `packages/shared`에 `SourceAnswerEventSchema`(discriminated union) — `{type:"source_answer.updated", provider, status, errorCode}` / `{type:"done", sourceAnswers}`. status·errorCode는 기존 enum 재사용. done에 최종 스냅샷을 실어 web이 별도 GET 없이 렌더한다
  - **POST → SSE**: 응답 자체를 `text/event-stream`으로 열고(EventSource 대신 fetch ReadableStream 전제, §4 구현 노트) 시작 직후 3사 `pending`을 1회씩, 이후 `processing`→`succeeded`/`failed` 전이를 push, 종료 시 `done`. 프록시 버퍼링 방지 헤더 포함
  - **게이트 분리**: Service를 `prepareGeneration`(소유권·사전 키 점검, 저장 0건)과 `runGeneration`(호출·저장)으로 나눠, 사전 점검 실패(`NO_AVAILABLE_KEYS`)·소유권 실패(404)는 **스트림을 열기 전에** 일반 에러 봉투로 응답한다
  - **GET 복원**: `GET .../source-answers`(requireAuth, userClient/RLS) — 새로고침 복원 전용 스냅샷
  - **최소 티어 모델로 교체**: `claude-haiku-4-5` · `gpt-5-nano` · `gemini-3.5-flash-lite`. 각 provider API로 유효성 실호출 확인 후 확정(env override 유지). 프롬프트 분량 제약은 유지
  - **검증**: 루트 `typecheck`·`lint`·`build` 통과. `curl -N` SSE 실측 — pending×3 → processing×3 → gemini 5.9s / claude 15.6s / openai 27.6s succeeded → done(n=3). **3사 전원 성공**(2a에서 막혔던 OpenAI 포함). psql로 model·prompt_version·sections·summary·response_meta 확인. GET 복원 3건 일치, 미소유 404(POST/GET 모두, 스트림 미개시), 무토큰 401, 플래그 OFF에서 `NO_AVAILABLE_KEYS` 400
  - **테스트 데이터 정리**: 2a 실측 Chat 2건 삭제(`931e07fa…`=3사 전멸·미완료 Question 포함, `86a5e2aa…`=부분 실패). CASCADE로 Question 2건·SourceAnswer 6건 함께 제거. 2b 실측 Chat 1건(`83a6263d…`, 미완료 Question 1)은 지시 범위 밖이라 유지
  - **문서**: `docs/dev-setup.md`에 AI Provider 실호출 절 추가(env 7종 형식 예시·BYOK 해석·프롬프트 텍스트 교체·엔드포인트 curl). 실제 키는 미기재
  - **남은 문제**: 스트림 도중 치명 오류 전용 이벤트는 MVP 생략(좌초 복구 범위) — 현재는 서버 로그만 남기고 스트림을 닫는다. SSE heartbeat 없음(45초×재시도로 최대 ~90초 무음 구간 가능)
  - **다음**: T-016.3 — web 재배선(Mock SourceAnswer 생성 중단 → fetch ReadableStream 구독·복원)
- **T-016.3 완료 (2026-07-22)** — SPEC-AI-001 web 재배선 + SSE 에러 종료 보강. **T-016 3단계 완료 = SourceAnswer 수직 슬라이스 관통**
  - **서버 보강**: 스트림 도중 오류 시 미종결(pending·processing) 행을 `failed`(UNKNOWN_ERROR)+excluded로 마감(`failUnfinished`) → 최신 스냅샷 재조회 → **정상과 동일 스키마의 `done`** 전송. 마감·재조회까지 실패하면 done 없이 종료(무한루프 방지) → 클라이언트가 GET으로 화해
  - **web SSE 구독**: `apiClient.streamSourceAnswers()` — fetch + Bearer로 열고 `ReadableStream`으로 `data:` 프레임을 shared `SourceAnswerEventSchema`로 파싱(EventSource 미사용). 컴포넌트는 fetch 직접 호출 없음(apiClient→adapter→Hook)
  - **live 경로 대체**: `serverBacked`(기본 경로)에서 Mock 생성 대신 `runLiveSourceAnswers()`. `?scenario=` dev 경로는 기존 메모리 Mock 타임라인 그대로
  - **점등 방식**: 스트리밍 중에는 `liveStatuses`(questionId→provider→status) 파생 상태만 갱신하고, SourceAnswer 배열은 `done`에서 한 번에 반영한다 — succeeded는 structuredContent가 있어야 계약을 만족하므로 **계약을 어기는 중간 상태를 만들지 않기 위함**
  - **끊김 화해**: `done` 없이 닫히면 `GET .../source-answers`로 재조회. 그것도 실패하면 3사를 로컬에서 failed 처리해 pending에 멈추지 않게 함
  - **Context(§9)**: 직전 completed Question의 FinalAnswer + 그 이전 DecisionNote를 문자열로 조립해 POST body `context`로 전달(소유권 판단엔 미사용)
  - **복원**: 마운트 하이드레이트에서 Question별 `GET .../source-answers` 병렬 조회로 SourceAnswer까지 복원
  - **Agenda 접속부**: `resolveSectionId()` — 템플릿의 `-s<N>` 순번을 실제 답변의 order 인덱스로 매핑(부족하면 마지막으로 클램프), **succeeded provider의 실제 섹션만** 참조. Agenda 비교 "내용"이 canned인 것은 의도된 상태(실제 비교는 AI-002)
  - **3사 전멸(§6.2)**: 고정 문구 `"모든 AI 응답을 받지 못했습니다. 잠시 후 다시 질문해 주세요."`로 FinalAnswer + **DecisionNote까지 저장한 뒤** completed 전이(완료 조건 = 둘 다, domain-policy §6·§5.4) + 서버에 완료 영속화
  - **검증**: 루트 typecheck·lint·build 통과. 브라우저 실측 — 질문→3사 실시간 SSE 점등(Gemini ✓ 먼저, 나머지 순차)→답변 카드·3열 모달에 **실제 답변 내용**→Mock Agenda 2건 해소→FinalAnswer·DecisionNote→completed·컴포저 재활성. 새로고침 후 GET 복원으로 3열 모달 실제 내용 유지. 잘못된 모델 ID로 **3사 전멸 경로 실측**(3줄 제외 배너 + 고정 문구 + 노트 + 완료). 서버 catch 경로는 **강제 에러 주입**으로 확인 — pending 3건이 `UNKNOWN_ERROR`+excluded로 마감되고 `done(n=3)` 수신, 확인 후 즉시 원복. `?scenario=provider-excluded` 회귀 정상
  - **테스트 데이터 정리**: `83a6263d…`(2b 실측, 미완료 Question 1) · `bbf9ecc9…`(T-016.1 회귀) 삭제 — Chat 2 + Question 2 + SourceAnswer 3. 이번 실측으로 생긴 3건(`9fbcef07…`·`5c2b7eba…`·`9ab9a345…`)은 지시 범위 밖이라 유지
  - **남은 문제**: 새로고침 후 Agenda·FinalAnswer·DecisionNote는 사라진다(서버 저장 대상이 아님 — 0.4 알려진 한계). 스트리밍 중에는 재시도 라벨("재시도 중…")이 뜨지 않는다(이벤트에 retryCount가 없음). SSE heartbeat·탭 이탈 시 취소·좌초 복구는 범위 밖
  - **다음**: SPEC-AI-002(Manager 실제 비교) — 어젠다 분류·충돌 판단 기준 확정
- **T-017 완료 (2026-07-22)** — 데모 배포 준비(하드닝). 새 기능 없음. 실제 배포·시크릿 입력은 운영자(Brett)
  - **SSE heartbeat**: 스트림을 연 뒤 15초마다 주석 프레임(`:hb`)을 흘려 배포 환경의 중간 프록시가 유휴 연결을 끊지 않게 함. `finally`에서 `clearInterval` → `end()` 순으로 정리(타이머 누수·EPIPE 방지). 주석 프레임은 `data:`로 시작하지 않아 클라이언트 파서가 무시 → **이벤트 계약 무영향**
  - **CORS 제한**: `app.use(cors())`(전체 허용) → `cors({ origin: CLIENT_ORIGIN })`. `CLIENT_ORIGIN`은 기존 env(기본 `http://localhost:5173`)라 로컬 dev는 무설정으로 동작. 쿠키를 안 쓰므로 `credentials` 미사용
  - **`docs/demodeploy.md` 신설**: Render(api) Root=저장소 루트·`npm ci && npm run build`·`node apps/api/dist/server.js`·env 필수 8종/선택 7종 표, Netlify(web) **base=저장소 루트**·`npm run build`·publish `apps/web/dist`, Supabase Auth URL, 교차 의존 배포 순서, cold start 안내, 문제 해결 표. 실제 키는 미기재
  - **문서에 박은 주의 2건**: ① Render Root를 `apps/api`로 잡으면 `/prompts`가 배포에서 빠져 생성이 전부 실패 ② Netlify base를 `apps/web`으로 잡으면 workspaces prepare가 루트에서 안 돌아 shared dist가 없어 web 빌드가 깨질 수 있음
  - **검증**: 루트 typecheck·lint·build 통과. `node apps/api/dist/server.js` 기동·health 200. `curl -N` raw 스트림에서 **heartbeat 2회(16.5s·31.5s, 15초 간격)** 관측 + 같은 스트림을 파서에 통과시켜 이벤트 10건·done 정상 파싱 확인. CORS 허용 출처엔 `Access-Control-Allow-Origin: http://localhost:5173`, 다른 출처엔 불일치 값이라 브라우저가 차단(정적 origin 방식). 브라우저 로컬 dev 회귀 — 3사 succeeded. **클린 체크아웃 → 루트 `npm ci` → `npm run build`** 로 `apps/web/dist`·`apps/api/dist`·`/prompts` 모두 정상 생성 확인
  - **테스트 데이터 정리**: `9fbcef07…`·`5c2b7eba…`·`9ab9a345…` 삭제 — Chat 3 + Question 3 + SourceAnswer 9
  - **남은 문제**: 이번 실측으로 Chat 2건(`be976957…` heartbeat check, `4ef7b654…` deploy hardening regression)이 새로 남음 — **데모 전 삭제 필요**. `render.yaml`은 만들지 않음(서비스 1개·env 전부 시크릿이라 과설계)
  - **다음**: SPEC-AI-002(Manager 실제 비교)
- **T-018 완료 (2026-07-22)** — 로그인 화면 테스트 계정 표시(프론트 전용, 데모용). 백엔드·계약·패키지·env 변경 없음
  - `LoginPage.tsx` 상단에 `TEST_EMAIL`·`TEST_PASSWORD` 상수. **데모 배포를 위해 일회용 테스트 계정 값을 커밋했다** — 이 값은 **프론트 번들과 git 히스토리에 모두 포함되므로 비밀이 아니다**(버려도 되는 계정만 사용). 자리표시자(`"REPLACE_ME"`) 가드가 있어 값이 없으면 박스를 숨긴다. **실서비스 전환 전 박스 제거 + 계정 비밀번호 교체/히스토리 스크럽 필요**
  - 로그인 폼 위에 Astryx `Banner`(info, `defaultIsExpanded`)로 "테스트 계정" 박스 — 이메일·비밀번호를 **마스킹 없이** 그대로 보여주고 "이 계정으로 로그인" 버튼 제공
  - 버튼은 필드를 채운 뒤 **기존 `signIn` 흐름으로 제출**한다(인증 우회 없음). 폼 제출과 버튼이 `submitCredentials()` 하나를 공유
  - 두 상수 중 하나라도 자리표시자면 박스를 렌더하지 않는다(방어)
  - **검증**: 루트 typecheck·lint·build 통과. 박스 표시·필드 자동입력·제출 확인. 자리표시자 상태에서 박스 숨김 확인
  - **후속 수정 (2026-07-22)**: 상수를 실제 값으로 바꾸면 `TS2367`(리터럴 타입끼리 교집합 없는 비교)로 **빌드가 깨지는 결함**이 있었다 — 자리표시자 상태에서만 검증한 탓에 놓쳤다. 두 상수에 `: string` 주석을 붙여 자리표시자·실제값 **양쪽에서 타입이 통과**하도록 수정하고, 실제 계정으로 로그인까지 실측(커밋 `77a353d`)
  - **남은 문제**: 커밋한 비밀번호는 **비공개 저장소 히스토리에 영구히 남는다**. 저장소를 공개로 전환하거나 협업자를 추가하면 그 시점부터 함께 노출된다. 데모 종료 후 계정 비밀번호 교체를 권한다
- **T-019.1 완료 (2026-07-30)** — SPEC-AI-002(Manager) **계약·마이그레이션·Mock 정합만**. Manager 실호출·프롬프트·OpenRouter는 T-019.2, Agenda 저장·SSE 발신은 T-019.3, web의 `buildMockAgendas` 제거는 T-019.4로 분리(이번엔 브라우저 Mock Agenda 흐름을 새 계약 위에서 유지)
  - **shared 계약**: `enums.ts`에 `auto_single_source` 추가·`AgendaKind`·`AgendaDisagreementType` 신설. `agenda.ts`에 `SourceRef`·`AgendaStance`(quotes·sourceRefs `.min(1)`)·`AgendaRecheckResult` 신설, `AgendaSchema` 확장(kind·selectedSourceRef·stances·disagreementType·revisedType·confidence·displayOrder + `sourceRefs`·`recheckResult` 정식화) 및 superRefine 4규칙 추가(§3.4·§9.2). SSE 계약을 `questionStream.ts`로 이동·`SourceAnswerEventSchema`→`QuestionStreamEventSchema` 개명, `done`→`source_answer.done`, Manager 이벤트 3종(`agenda.created`·`agenda.judged`·`agenda.done`) 추가
  - **마이그레이션 2개**(트랜잭션 분리): `20260730120000_agenda_manager_enums.sql`(enum 추가·신설) + `20260730120100_agenda_manager_columns.sql`(agendas 5컬럼·`questions.manager_meta`·`agendas_selected_source_ref_ck` §9.3 개정 — 합의·단일 소스는 실제 참조, NO_VALUE는 사용자 행동에서만)
  - **web**: 로컬 `AgendaSourceRef`·`AgendaStance` 제거→shared 사용, `Agenda` 교차타입 제거, `agendaRecheckText`를 객체(`.response`)로. Mock에 신규 필드·실제 섹션 부분 문자열 quotes(§11) 채움, 단일 소스 시나리오를 `single_source` 자동 통과로 전환(AnswerCard 자동 통과 요약에 "단일 답변" 중립 라벨 — 합의로 표현 금지, domain-policy 5.3·SPEC-AI-001 §6.1). SSE 이름 교체(api controller·apiClient·apiStorageAdapter), agenda.* 이벤트는 무시(소비는 T-019.4)
  - **검증**: 루트 typecheck·lint·build 통과. `supabase db push` 원격 적용 후 psql로 신규 컬럼·enum·CHECK 정의(§9.3)·RLS 3정책·GRANT 불변 확인. **questions 조회 회귀 없음** — Repository가 명시적 `QUESTION_COLUMNS`(manager_meta 미포함)로 select하므로 새 컬럼이 조회에 실리지 않음(실제 프로젝션으로 기존 9행 조회 확인). Agenda 계약 만족은 실제 `AgendaSchema`로 8개 정상 상태 통과·5개 위반 거부를 스크립트로 검증(MockValidationBanner 미발생 근거)
  - **브라우저 회귀 (2026-07-30, 테스트 계정 로그인)**: 5개 시나리오 전부 PASS — happy-path(3사 SSE→Agenda→충돌 2해소→FinalAnswer→노트→completed), recheck-path(재검색 결과 박스에 recheckResult.response 렌더 정상, [이 결과로 결정]→user_accepted_after_recheck 통과), provider-excluded(제외 배너), all-rejected(고정 문구), single-source-fallback(auto_single_source 자동 통과·"단일 답변" 중립 라벨·합의 표현 없음). 전 시나리오 MockValidationBanner 미발생·콘솔 오류 없음
  - **회귀 1건 발견·수정**: single_source를 자동 통과로 바꾸면서 충돌 0건 Question이 사용자 판단 트리거를 잃어 FinalAnswer 없이 review_required에 갇혔다. `applySourceAnswerEvent` settle을 setState 기반으로 바꿔, 빌드된 Agenda가 전부 passed/rejected면 같은 갱신에서 FinalAnswer·DecisionNote 생성 후 completed로 전이하도록 수정(충돌이 있으면 기존대로 review_required). 재검증 완료
  - **미확인/후속**: 완료 뷰에서 single_source가 "결정 사항·사용자 판단 우선 적용" 그룹에 들어가고 노트 bullet이 "— 내 결정 반영"으로 나오는 건 사용자 판단이 아니므로 문구가 약간 어색(합의 오표기는 아님) — 문구 정교화는 T-019.4 후보. Manager 실제 판정·저장·web 소비는 T-019.2~4
- **T-019.2 완료 (2026-07-30)** — SPEC-AI-002 **Manager 분류 파이프라인 단계 1~5 실호출**. `buildAgendaDrafts(questionId, succeeded[]) → { drafts, managerMeta, trace }`. Agenda 저장·단계 6·7·SSE·web 재배선은 T-019.3~4. **라우터 미연결**(진입점은 개발 스크립트 `npm run manager:classify`뿐)
  - **구조**: `apps/api/src/modules/agendas/`(types·service·ports/AgendaClassifier·adapters/openRouterClassifier+registry·pipeline/pickPivot·shuffle·suspiciousTitle·postProcess·scripts/classify+fixtures 3종·managerPrompts). 프롬프트 `prompts/manager/classify|leftover/v1.md`. env(§15.2, OPENROUTER_API_KEY·MANAGER_MODEL required)+`.env.example`. 반환 초안은 §7.7 균일형(participantCount+섹션+title·summary·displayOrder만; kind·stances·selectedContent는 단계 7=T-019.3)
  - **OpenRouter**: fetch 직접 호출(명시 body 타입, any 없음), `response_format json_schema strict`·`provider.require_parameters`·max_tokens 미설정(§15.3). 쟁점 ID enum 런타임 생성(결정 2). 재현성: pivot=fnv1a·shuffle=mulberry32, Math.random 없음(AC1). 참여 provider 수는 코드가 셈(§7.2)
  - **⚠️ 실측 (qwen/qwen3.7-plus, 2026-07-30) — 프롬프트는 v1 그대로, 튜닝 없이 통과**:
    - **JSON 파싱 성공률 8/8 (100%)**, 스키마 검증 실패 0. 구조화 출력 **실작동 확인**(§18 미지수 해소)
    - **재현성**: 같은 입력 5회 정렬 구조·pivot·shuffleSeed 완전 동일
    - **stage3OutputTokens**: 1026~4496 (3사 fixture 평균 ~1515, 실제 질문 4496). **§5.5의 800토큰 가정을 2~5배 초과, §14.1 1500 경고를 8회 중 3회 넘김** → §5.5 재추정 또는 provider별 분할 검토 필요
    - **stage3 지연**: fixture 20~44초, 실제 질문(5쟁점·7섹션) **84초 = 45초 타임아웃+재시도**. **§2.3의 5~15초 추정을 2~5배 초과.** qwen/qwen3.7-plus는 §2.3이 가정한 "최저가 티어"보다 느림 — 모델 재검토 신호(판단은 사용자). 타임아웃·재시도 로직은 정상 작동
    - **multiAssignRate**: fixture 0%, 실제 질문 29%(임계 30% 직전). **leftoverRate**: fixture 0%, 단계4 트리거 fixture 50%. **titleRevisionRate**: 단계4 fixture 100%(의심 제목 1개 중 1개 중립화)
    - **의미 정렬 품질(육안)**: 대체로 양호 — "정책 관리"↔"정책 작성 위치", "점검 체크리스트"↔"검증 방법" 동의어 병합 성공. 오정렬 1건: openai "역할 구분(anon/authenticated)"을 "service_role 키 취급"이 아닌 "기본 원칙"에 배정(경미)
    - **단계 4 실검증**: 의심 제목 "service_role 키를 반드시 서버에서만 써야 하는 이유" → "service_role 키의 서버 사용 제한 이유"(반드시·이유 제거) + 무관 섹션(성능/인덱스)을 재배정 대신 **신규 쟁점 생성**(§6.4 편향 준수)
  - **검증**: 루트 typecheck·build 통과, lint(web만) 통과. web 무변경 → Mock 4시나리오 흐름 영향 없음(브라우저 렌더 확인). DB 미기록·비밀값 미노출 준수
  - **후속(T-019.3)**: 단계 6(합의/충돌 판정)·단계 7(selectedContent·kind 마감)·Agenda DB 저장·SSE Manager 이벤트. **모델 지연·토큰 초과는 T-019.3 착수 전 사용자 판단 필요**(모델 교체 여부)
- **T-019.2.1 완료 (2026-07-30)** — SPEC-AI-002 §5.5.2 이행: **단계 3을 비-pivot provider별 병렬 분할 + 스키마 다이어트**. 파이프라인 로직·판정 규칙·모델(qwen/qwen3.7-plus)·§5.3 판정 문구는 그대로. 단계적 측정(분할만→분할+다이어트)
  - **구현**: `agendas.service.ts` 단계 3을 provider별 병렬(동시성 `MANAGER_CONCURRENCY`), 단계 3b도 provider 단위. **실패 격리** — 한 provider 호출 실패 시 그 섹션만 leftover, 나머지는 살림(§2.5). 병합은 provider 알파벳 정렬 순서로 **결정론적**(AC1). `pipeline/concurrency.ts`(순서 보존) 신설. 다이어트: `topicRestated` 40자 명시, `secondAgendaReason`를 `required`에서 제외. provider별 호출 성공/실패·토큰·지연을 `trace.stage3Calls`에 남겨 "모델 미배정"과 "호출 실패"를 구분(§6.3 오진 방지)
  - **⚠️ 실측 3시점 (같은 fixture 3종 ×3 + 실제 질문, 전 구간 파싱 성공·스키마 실패 0·타임아웃 0)**:

    | 케이스 | 기준선(단일호출) | ① 분할만 | ② 분할+다이어트 |
    |---|---|---|---|
    | **실제 질문(5쟁점·7섹션)** wall-clock | **84초**(45초 타임아웃+재시도) | **33초**(타임아웃 없음) | 42.7초 |
    | 실제 질문 호출당 토큰 | 4,496(단일) | 1,779+1,621 | 2,255+1,098 |
    | 3사 fixture wall-clock(≈가장 느린 호출) | 20~44초 | 24.6~42.4초 | 20.1~38.9초 |
    | 3사 fixture 호출당 최대 토큰 | 1,026~2,346(단일) | 1,260~2,077 | 1,045~2,065 |
    | 3사 fixture 합계 토큰 | 위와 동일(단일) | 2,275~2,741 | 1,536~2,949 |
    | multiAssignRate(실제 질문) | 29% | 0% | 0% |

  - **핵심 결론**: **분할이 성패를 갈랐다.** 실제 질문 84초→33초, **45초 타임아웃+재시도를 제거**(입력이 커질수록 급격히 느려지던 지점 완화). 단일 4,496토큰이 호출당 ~1,600~1,800으로 쪼개짐
  - **호출당 토큰**: 섹션이 많은 provider(gemini 3~4섹션) 호출은 여전히 1,500 경고를 종종 넘김(1,547~2,255). 다이어트로 확실히 못 내림 — **Qwen 런투런 변동(같은 입력 gemini 1,045~2,255)이 다이어트 효과를 덮음**
  - **다이어트 판정**: **B-2 `secondAgendaReason` optional 허용됨**(OpenRouter·Qwen strict에서 20/20 파싱, 스키마 오류 0 → `required`에서 제외 확정). **B-1 40자는 품질 저하 없음** — 기준선 동의어 병합 쌍이 ②에서도 유지: "정책 관리"(gemini)↔"정책 작성 위치", "역할과 키"(gemini)↔"service_role 키 취급", "점검 체크리스트"(gemini)↔"검증 방법" 모두 그대로. (경미 변동: ambiguous한 "역할 구분"(openai)의 배정만 A↔B로 흔들림 — 기준선에도 있던 오배정)
  - **미해소/신호**: 단계 3 지연이 여전히 20~43초. **모델 자체가 호출당 느림**(입력이 작은 2사 fixture도 12~30초). 실제 질문 ② 참여 분포가 A2·C2·D2로 흔들린 1회 관측(다이어트 vs Qwen 변동 미구분, n=1). **모델 교체 판단(§5.5.1)에 필요한 지연 하한은 분할로도 ~30초** — 단계 6(쟁점별 N회)이 붙는 T-019.3 전 모델 결정에 이 수치를 쓰면 됨
  - **검증**: 루트 typecheck·build, lint(web) 통과. web 무변경. 타임아웃 45초 유지(늘리지 않음). 비밀값 미노출
- **T-019.3 서버 구간 완료 / web 재배선 미완 (2026-07-30)** — SPEC-AI-002 §8·§9·§7.6~7.7·§11·§12(§12.5 제외)·§2.5·§14·§16. 재검토(§10)와 PATCH의 `recheck`·`retry_recheck`는 T-019.4로 제외. **⚠️ §12.5 web 재배선은 손대지 않았다** — `buildMockAgendas`가 그대로 있고 web은 `agenda.*` SSE 이벤트를 무시하므로, 서버가 실제 Agenda를 만들어 저장·발신하는데도 **브라우저에는 여전히 Mock Agenda가 보인다**
  - **구현**: `ports/conflictComparator.port.ts`+`adapters/openRouterComparator.adapter.ts`+`registry`(단계 6), `pipeline/judge.ts`(쟁점별 병렬 판정 오케스트레이션·`onJudged` 건별 발신), `pipeline/grounding.ts`(§11 검증 2·3·4), `pipeline/finalize.ts`(§9.2 규칙표 — **경로 무관 단일 마감 지점**, §7.6), `agendas.repository.ts`(2단계 저장 §12.1)·`agendas.controller.ts`(GET 스냅샷·PATCH 3액션)·라우트 연결, `agendas.service.ts`에 `runManagerForQuestion`·`applyUserDecision` 추가, `sourceAnswers.controller.ts`가 **같은 SSE 스트림에 Manager 구간을 이어붙임**(§12.2, 새 스트림 열지 않음). `adapters/openRouterCall.ts`로 HTTP·재시도·파싱을 단계 3·4·6이 공유. 프롬프트 `prompts/manager/compare/v1.md`
  - **마이그레이션**: `20260730120200_agenda_stances.sql`(`agendas.stances` jsonb + `agendas_stances_ck` — draft만 빈 배열 허용). **실 DB 적용 완료**(psql로 컬럼·CHECK·`schema_migrations` 이력 확인)
  - **검증 (루트 typecheck·lint·build 통과)**:
    - **날조 인용 주입 8/8 통과**(`npm run manager:judge -- --grounding-test`, LLM 0회, 결정론적): 정상 대조군·원문 부재·타 provider 인용·단어 추가·공백만 차이(통과해야 함)·전량 날조로 stance 폐기·전 stance 날조로 쟁점 폐기·비참여 provider stance
    - **자연 발생 날조 탐지**: 3사 실측에서 openai가 원문에 없는 문장을 인용으로 내 `not_in_source`로 폐기됨. §11이 주입 테스트에서만 작동하는 게 아님을 확인
    - **충돌 0건 경로 실 DB 통과**: `MANAGER_CONFLICT_TYPES`를 아무 유형과도 매칭 안 되는 값으로 두어 6쟁점 전부 자동 통과 → Question이 `review_required`로 **전이되지 않고** 전 쟁점 `passed`·`selectedContent` 전부 채워짐. 검증 하네스가 만든 행만 삭제하고 Question 상태 복원함
    - **실 DB 저장·CHECK 정합**: `stances` 채움, `auto_single_source` 경로, `agendas_stances_ck`·`agendas_selected_source_ref_ck`(§9.3) 통과. `manager_meta`에 `conflictTypes`·`comparatorVersion`·품질 지표 스탬프(결정 4·6). 충돌 1건 있는 질문은 `review_required`로 정상 전이
    - **재현성(AC1)**: pivot·shuffleSeed 동일 입력에서 완전 일치. `Math.random()` 미사용
  - **⚠️ 실측 문제 — 지연이 지배적 (상세 §14.4)**: 단계 6 출력 토큰 **694~6,365**(§5.5 추정 430의 1.6~15배), Manager 전체 **37.9~145.5초**(§2.3 예산 10~30초의 최대 5배), 첫 `agenda.judged` **14.9~95.1초**. §2.3이 기댄 "조기 표시로 완화" 가정이 **95초 케이스에서 무너진다**
  - **원인 규명 완료 (후속 조사)**: 지연은 **출력 토큰에 정비례**한다 — 처리량이 ~53토큰/초로 일정(10지점 거의 완전 선형). 그런데 최종 JSON은 **513~700자뿐**이고 `comparisonNote`는 84~172자다. `completion_tokens`의 **88~94%가 `reasoning_tokens`** — `qwen/qwen3.7-plus`가 추론 모델이라 우리가 읽지도 저장하지도 않는 확장 사고 토큰을 1,300~4,700개 생성한다. **지연의 90%가 버리는 사고 과정 생성비다.** §8.6이 `comparisonNote`로 유도한 "reason free, constrain late"는 모델 네이티브 추론과 중복(100토큰 vs 4,700토큰)
    - **완화안 실측**: `reasoning:{effort:"low"}` → 토큰 39% 감소(3,183→1,943, ~60초→~37초), **grounding 11/11 유지**, 판정 3/4 일치(불일치 1건은 §8.5가 애매하다고 인정한 `main_answer`↔`detail_content` 경계) → **유력**. `reasoning:{enabled:false}` → 토큰 92% 감소지만 **grounding 붕괴(2/8), 4쟁점 중 3개가 stance 0개 → §11-4로 폐기** = 쟁점이 사라짐 → **실격**. 추론을 끄면 원문을 찾아 정확히 복사하는 작업 자체를 못 한다
    - **⚠️ 파이프라인에 적용하지 않았다 — 사용자 판단 필요.** 후보 ①`effort:"low"` 적용(근거상 유력, 되돌리기 쉬운 한 줄, 단 n=4 소표본) ②동시성 상향(wall-clock만 줄고 첫 판정 시간은 그대로 → 효과 제한적) ③모델 재검토(T-019.2.1의 품질 결정을 되돌리는 것)
    - **측정 함정 기록**: 조사 중 `fetch`가 **응답 헤더 도착 시 resolve**하는 것을 놓쳐 호출 지연을 1~2초로 오측정한 구간이 있었다(생성 시간은 `res.json()`/`res.text()`에 들어간다). 순차 3회 "호출당 1.1초"가 wall 82.5초와 모순되어 드러났다. 파이프라인 계측은 `response.text()`까지 await하므로 처음부터 옳았고, 토큰·품질 수치는 타이밍과 무관해 영향 없음
  - **지표 추가**: `quoteRejectRate` 0%인데 쟁점이 폐기되는 조합(33.3% 폐기 / 인용 폐기 0건)이 관측됐으나 원인 관측값이 하나도 없었다 — quote 검증에 도달하기 전 버려지는 stance가 있기 때문. `stancesDiscarded`(`empty_output`·`not_participant`·`duplicate_provider`)를 신설해 폐기 사유를 셈(§14.2)
  - **미확인/남은 문제**:
    - **§12.5 web 재배선 전량 미완** — `buildMockAgendas` 제거, `agenda.*` 이벤트 소비, SSE 종료 판정 규칙(§12.2), 자동 통과 vs 사용자 판단 분류(`resolutionReason` 기준), `recheck_requested` [다시 시도] 버튼. **브라우저 사용자 시나리오는 하나도 확인하지 못했다**(서버만 검증)
    - GET 스냅샷·PATCH 3액션은 **HTTP로 호출해 보지 않았다** — 라우트 연결과 타입만 확인. 사용자 JWT가 필요해 서버 코드 경로로만 검증
    - `agendaDropRate` 33.3% 1회의 근본 원인 미규명(`stancesDiscarded` 계측만 넣음, 재현 안 됨)
    - `main_answer` 0% 관측 2회 — §14.2 "충돌 과소 탐지 의심" 임계 해당. 판정 품질 축적 필요
    - `confidence` 표준편차 0.025~0.045(n=2·4) — §14.3의 0.05 미만이나 표본 부족, 20~30건 축적 후 재판정
- **T-019.3.1 완료 (2026-07-30)** — Manager 품질 이상 진단. T-019.3에서 각 1회 관측되고 원인 미규명이던 `agendaDropRate` 33.3%·`quoteRejectRate` 33.3%를 규명했다. **Manager(OpenRouter) 호출 18회/상한 20** + 3사 API 각 1회
  - **A. 쟁점 소멸 원인 = 확정. `quotes: []`(스키마가 허용하는 빈 인용 배열)**
    - `AgendaStanceSchema`(저장 계약)는 `quotes.min(1)`인데 `CompareStanceSchema`(LLM 출력)와 LLM에 보내는 JSON Schema에는 **최소 개수 제약이 없다.** 모델이 `quotes: []` stance를 내는 것이 합법이다
    - 그 stance는 `grounding.ts`에서 `for (const quote of value.quotes)` 루프가 0회 돌아 `quotesTotal`·`quotesRejected`에 **아무것도 더하지 않고** `kept.length === 0`으로 폐기된다 → **어느 지표에도 안 잡힘.** "`quoteRejectRate` 0%인데 쟁점 폐기" 조합이 정확히 이것
    - **실증**: 프로덕션 경로 재실행에서 `agendaDropRate 25%` · `quoteRejectRate 0%` · **`empty_quotes: 3`**(호출 2회에 3건) — 드문 사고가 아니라 상시 발생
    - **(a)/(b) 판별 = (a) 모델 실패.** 폐기된 "정책 작성 위치" 쟁점의 배정 섹션(`claude-s2`+`gemini-s1`)은 둘 다 "정책은 SQL 파일로 작성/관리"를 직접 말하고 있어 인용할 원문이 양쪽에 충분했다. 또 **같은 fixture·같은 seed의 다른 회차는 폐기 0건** — 동일 배정에서 결과가 갈렸으므로 단계 3 배정 문제가 아니다
    - **A-3 배제**: `participantCount`·`sourceRefs`·judge의 `participants`가 모두 `finalizeDrafts`의 같은 `c.sections`에서 파생돼 구조적으로 어긋날 수 없다. `not_participant`·`providerRefs.length===0` 경로는 이번 사건과 무관(후자는 도달 불가 방어 코드)
  - **B. 인용 폐기 원인 = 최소 의역. 날조가 아니다**
    - 실관측 폐기 1건을 원문과 대조: 원문 `익명 사용자(anon)**와**…` → 모델 인용 `익명 사용자(anon)**과**…` — **조사 한 글자 차이, 내용 100% 동일**
    - §11의 `normalized`는 공백만 정규화하므로 조사·어미 변형을 날조와 구분할 수 없다. **정당한 근거가 죽고, 인용이 0개가 되면 stance가 죽고, stance가 0개면 쟁점이 사라진다**
    - **마크다운·유니코드 FP는 잠재 위험이나 이번 원인은 아니다**: 실 DB 140개 섹션에 `**`·둥근따옴표·en dash·말줄임표가 **전부 0건**(목록 시작 1건). 다만 프로브 10건 중 6건이 폐기됨 — 원문 형식이 바뀌면 즉시 현실화된다
    - **저장 데이터 정합은 양호**: `c1e496e9`의 저장된 인용 17건 전부 자기 provider 원문에 실재(근거 없음 0건)
  - **C. quotes ↔ 추론 토큰 상관 = 가설 미지지**
    - n=5 실측 상관: 섹션 수 −0.556 · 섹션 원문 총 길이 −0.597 · quotes 총 길이 −0.438 · `comparisonNote` 길이 −0.522. **전부 음의 상관이고 n=5 유의 임계 r≈0.878 미만** → 입력 크기로 추론 토큰이 설명되지 않는다
    - 따라서 **"인용 길이 상한"은 지연 완화책으로 근거가 없다.** reasoning 비중 73~92%, 처리량 49 t/s(§14.4의 53 t/s 재확인), 지연↔completion r=0.826
  - **D. GET/PATCH 실호출 전부 통과** (dev 서버 + 테스트 계정 토큰)
    - `GET` 200 · Agenda 5건 · **`stances` 정상 매핑**(Repository 우려 지점 해소) · `selectedSourceRef`가 §9.2대로
    - `accept`→`passed`/`user_accepted`/실제 참조(서버가 원문 되읽음), `compose`→`passed`/`user_composed`/`NO_VALUE`, `reject`→`rejected`/`user_rejected`/`NO_VALUE`
    - 무토큰 401 · 엉터리 토큰 401 · 미소유 Question·Chat 404 · 없는 agendaId 404 · `passed`에 PATCH 409(`INVALID_AGENDA_TRANSITION`) · 이 쟁점 근거 아닌 sourceRef 400
    - **body 위조 `userId` 무시 확인**(소유자 `user_id` 불변). **3액션 각각 원상복구 후 `updated_at` 외 전 컬럼 일치 검증**, Question도 `review_required`로 복원
  - **E. SSE 실 스트림 = 이벤트 순서·heartbeat 정상, 그러나 70초 공백 발견**
    - 순서 정상: `source_answer.updated`×6 → `source_answer.done`(30.9s) → `agenda.created`(100.5s) → `agenda.judged`×3 → `agenda.done`(185.6s) → 닫힘. **15초 heartbeat가 Manager 구간에도 그대로 흐름**(12회)
    - ⚠️ **`source_answer.done`(30.9s) ~ `agenda.created`(100.5s) 사이 69.7초 동안 Agenda 관련 이벤트가 하나도 없다.** 단계 1~5가 SSE 이벤트를 전혀 내지 않기 때문이다. §14.4가 잰 "첫 판정" 시각은 파이프라인 내부 기준이라 이 공백이 보이지 않았다 — **사용자 관점의 체감 지연은 heartbeat만 오는 70초 사각지대**
    - `agenda.judged`는 흩어져 도착(100.8s ×2 즉시=single_source, 141.0s) — 조기 표시 자체는 작동
  - **고친 것 (관측만, 승인 범위)**
    - `stancesDiscarded`에 4번째 사유 `empty_quotes` 추가. 주석의 "전부 LLM이 스키마를 어긴 경우다"를 정정 — `empty_quotes`는 **스키마가 허용하는** 경우이며, 그 문구가 이번 누락의 원인이었다
    - **`stancesDiscarded`를 `ManagerQualityMetrics`에 배선** — T-019.3에서 `JudgeDraftsResult`에만 넣어 `manager_meta`에 저장되지 않았고, 그 탓에 E 실행에서 폐기가 재현됐는데도 진단값이 또 유실됐다. 지표는 저장되는 곳까지 도달해야 지표다
    - `--grounding-test`에 재현 케이스 4건(`empty_quotes` 귀속·`empty_output` 구분·오귀인 방지) + false positive 프로브 10건 추가. **LLM 0회로 12/12 통과**
  - **고치지 않은 것 (설계 판단 필요)**: `minItems: 1` 추가 — (b) 해석에서 모델이 억지 인용을 하게 되고, 그때 나올 **"원문에 있지만 이 쟁점과 무관한 문장"은 grounding이 잡지 못해** 조용한 폐기보다 나쁠 수 있다. 정규화 규칙 완화(조사·어미·유니코드) — 날조 탐지력과 맞바꾸는 결정. 단계 1~5 구간 SSE 진행 이벤트 추가
  - **남은 불확실성**: 원 33.3% 회차의 폐기 인용은 §16.3에 따라 저장되지 않아 **소급 복원 불가**(재실행 2회 모두 `quoteRejectRate` 0%였다). `empty_quotes`와 `empty_output` 중 원 사건이 어느 쪽이었는지는 당시 지표가 없어 확정 불가 — 다만 둘 다 "모델이 쓸 인용을 못 냈다"로 동일하고, 이제 양쪽이 구분돼 기록된다
  - **검증 부산물**: 테스트 계정에 SSE 검증용 Chat `a986b4e7`·Question `f165d95d`(Agenda 3건)가 남아 있다. 지워도 무해하다. dev 서버(api:4000)는 계속 켜 둠
- **T-019.3.2 완료 (2026-07-31)** — `reasoning: { effort: "low" }` A/B 측정. **파이프라인에 적용하지 않았다**(하네스에서만 조건으로 줌, 코드는 무설정 그대로). Spec 미갱신 — 사용자 판단 후 일괄 반영. **Manager 호출 56회/상한 60**, 3사 API 0회
  - **설계**: `three-providers` fixture 1종. 단계 1~5를 1회만 돌려 초안을 `three-providers-drafts.json`으로 **고정**하고 모든 반복이 글자 그대로 같은 입력을 받게 했다(단계 3 배정 변동을 판정 비교에서 제거). 조건은 **교대 실행**(baseline → low → …). 지연은 본문을 다 읽은 뒤 측정. 초안 쟁점 4개 = A 기본 원칙(참여2) · B 정책 작성 위치(참여3) · C service_role 키 취급(참여2) · D 검증 방법(참여2)
  - **precheck**: `reasoning_tokens` 1554 → 966 (**37.8% 감소**) — 파라미터가 실제로 먹는 것을 확인하고 본 측정 진행
  - **C-1. 판정 — 쟁점별 5회 분포** (조건당 20판정)

    | 쟁점 | 조건 | 5회 판정 분포 | 최빈 |
    |---|---|---|---|
    | 기본 원칙 | baseline | `detail_content`×1 `main_answer`×4 | main_answer |
    | 기본 원칙 | low | `main_answer`×5 | main_answer |
    | 정책 작성 위치 | baseline | `detail_content`×1 `main_answer`×4 | main_answer |
    | 정책 작성 위치 | low | `detail_content`×1 `main_answer`×4 | main_answer |
    | service_role 키 취급 | baseline | `paraphrasing`×3 `detail_content`×2 | paraphrasing |
    | service_role 키 취급 | low | `detail_expansion`×1 `detail_content`×2 `main_answer`×2 | main_answer |
    | 검증 방법 | baseline | `detail_content`×2 `main_answer`×3 | main_answer |
    | 검증 방법 | low | `detail_content`×2 `main_answer`×3 | main_answer |

  - **C-1. `main_answer` 비율**: baseline **55.0%**(11/20) · low **70.0%**(14/20). **둘 다 §14.2 임계(5% 미만) 를 크게 상회** → T-019.2·3에서 관측된 `main_answer` 0%는 **런투런 잡음이었고 체계적 충돌 과소 탐지가 아니다**(§14.4의 우려 해소)
  - **C-1. 조건 내부 변동 = 잡음 수준**: 판정이 5회 내내 동일한 쟁점이 **baseline 0/4 · low 1/4**. **기준선이 4개 쟁점 전부에서 흔들린다.** 이 잡음 위에서 조건 차이를 읽어야 한다
  - **C-1. 불일치 방향** (§8.5 — 충돌→합의는 복구 불가)

    | 기준 | 동일 | 낮아짐(⚠️ 충돌→합의) | 높아짐(안전) |
    |---|---|---|---|
    | 쟁점별 최빈값 (4쟁점) | 3 | **0** | 1 (`paraphrasing`→`main_answer`) |
    | 회차 매칭 (20쌍) | 11 (55.0%) | **3 (15.0%)** | 6 (30.0%) |

  - **C-2. 인용·stance**

    | 조건 | `empty_quotes` | 쟁점 폐기 | stance 부분 손실 | `quoteRejectRate` | grounding |
    |---|---|---|---|---|---|
    | baseline | **2** | 2/20 = 10.0% | 1/20 = 5.0% | 6/57 = 10.5% | 51/57 |
    | low | **0** | 0/20 = 0.0% | 1/20 = 5.0% | 2/61 = 3.3% | 59/61 |

    stance 생존 상세 — baseline `2→0`:2건 `2→1`:1건 `2→2`:12건 `3→3`:5건 / low `2→1`:1건 `2→2`:14건 `3→3`:5건
  - **C-3. 비용·지연 — ⚠️ 평균과 중앙값이 반대를 말한다**

    | 조건 | completion 평균 | reasoning 평균 | reason% | 지연 평균 | 지연 최대 |
    |---|---|---|---|---|---|
    | baseline | 2847.9 (±3247.6) | 2629.3 (±3262.3) | 92.3% | 53.4s | **292.5s** |
    | low | 2360.4 (±1296.2) | 2128.8 (±1298.8) | 90.2% | 44.7s | 118.4s |

    평균 기준 completion −17.1% · reasoning −19.0% · 지연 −16.2%. **그러나 baseline의 표준편차가 평균보다 크다**(±3247.6 > 2847.9). 이상치 1건(baseline r4 `service_role`, **16,125토큰 / 292.5초 / 추론 15,985**)이 평균을 혼자 끌어올린 것이다.

    | 조건 | p50 | p75 | p90 | 최대 | 최대/중앙 |
    |---|---|---|---|---|---|
    | baseline (토큰) | 2066 | 2851 | 3490 | 16125 | 7.8 |
    | low (토큰) | **2148** | **2892** | **3530** | 6438 | 3.0 |
    | baseline (지연s) | 39.4 | 53.3 | 65.0 | 292.5 | 7.4 |
    | low (지연s) | **40.5** | **55.9** | **66.2** | 118.4 | 2.9 |

    **중앙값 기준으로는 low가 오히려 4.0% 크고 2.6% 느리다.** p50·p75·p90이 사실상 동일하고 **최대값만 다르다** → `low`의 실효는 전형값 감소가 아니라 **극단 꼬리 절단**이다. 처리량은 양쪽 52 t/s로 동일. (T-019.3.1의 "39% 감소"는 n=4 단발이었고, 이번 n=20에서 재현되지 않는다)
  - **C-3. `confidence`** (§14.3 축적): baseline n=20 평균 0.8385 **표준편차 0.0744** / low n=20 평균 0.7790 **표준편차 0.1229**. **양쪽 다 0.05 이상** → §14.3의 "자기보고 확신도 무의미" 판정 조건에 해당하지 않는다. 누적 n=40으로 20~30건 기준 충족
  - **단계 3 A/B (n=3, 조건 교대) — `low`가 오히려 나쁘다**

    | 조건 | 회차별 지연(ms) | 평균 | 회차별 토큰 | 평균 |
    |---|---|---|---|---|
    | baseline | 17613 · 13175 · 17661 | 16150 | 1391 · 1141 · 1455 | 1329 |
    | low | 60931 · 46387 · 22294 | **43204** | 4431 · 3126 · 1840 | **3132** |

    **지연 2.68배 · 토큰 2.36배**, 회차별로도 3/3 전부 low가 크다(r1 3.46배 · r2 3.52배 · r3 1.26배). 단계 6과 방향이 정반대다
  - **단계 3 배정 안정성 — 조건과 무관하다**: 조건 내 3회 쌍별 일치율 baseline **93.3%** · low **93.3%**, 조건 간 9쌍 평균 **93.3%** — 셋이 동일. 쟁점 목록(4개·제목)은 6회 전부 같았다. 흔들린 섹션은 2개뿐이고 조건별로 1건씩 대칭: `gemini-s1` 정책 작성 위치→기본 원칙(b3), `openai-s1` 기본 원칙→검증 방법(l3). `leftoverRate` 0 · `multiAssignRate` 0 · `titleRevisionRate` null(의심 제목 없음) 전 회차 동일. **배정 잡음(~7%)은 `low` 탓이 아니라 상시 존재한다**
  - **D. 세 질문에 대한 수치 답**
    1. **low 판정이 기준선 내부 변동 범위 안에 있는가** → **3/4 쟁점은 안, 1개는 벗어남.** 기본 원칙·정책 작성 위치·검증 방법은 baseline이 관측한 유형 집합에 포함된다. `service_role 키 취급`만 baseline{`paraphrasing`,`detail_content`} → low{`detail_expansion`,`detail_content`,`main_answer`}로 **벗어났고, 벗어난 방향은 더 심각한 쪽(안전 방향)**이다
    2. **위험 방향 치우침** → **아니다.** 회차 매칭 20쌍에서 낮아짐 3 vs 높아짐 6으로 **안전 방향이 2배**다. 쟁점 최빈값 기준으로는 낮아짐 0건
    3. **low가 `empty_quotes`·`agendaDropRate`를 늘렸는가** → **아니다. 줄었다.** `empty_quotes` 2→0, 쟁점 폐기 2/20→0/20, `quoteRejectRate` 10.5%→3.3%. stance 부분 손실만 1건으로 동일. **추론 축소가 인용 생성을 악화시킬 것이라는 우려는 이 표본에서 관측되지 않았다**
  - **n 부족으로 답할 수 없는 것**: 위 3번의 방향은 확인됐으나 `empty_quotes` 절대 건수가 baseline 2건이라 **감소가 유의한지는 판정 불가**(0 vs 2). 조건당 최소 60판정(현재 20의 3배, 쟁점 4개×15회)이면 5%p 차이를 분간할 수 있을 것으로 추정한다. 1번의 `service_role` 이탈도 n=5라 조건 효과인지 잡음인지 미확정 — 같은 쟁점만 15회씩 반복하면 갈린다
  - **⚠️ 측정 중 발견 (범위 밖, 기록만)**
    - **단계 6 호출의 40~45%가 `MANAGER_TIMEOUT_MS`(45초)를 초과한다** — baseline 9/20, low 8/20. 파이프라인이라면 이들이 타임아웃 후 `withOneRetry`로 재시도되므로 **실제 호출 수와 지연이 배가된다.** T-019.3에서 관측된 `stage6DurationsMs` 88,234ms 같은 값이 "45초 타임아웃 + 43초 재시도"였을 가능성이 있다
    - **교락 가능성**: `provider.require_parameters: true`와 함께 `reasoning`을 넣으면 **그 파라미터를 지원하는 업스트림으로 라우팅이 제한**된다. 단계 3에서 low가 2.7배 느린 것이 effort 효과가 아니라 라우팅 변화일 수 있다. 이 측정으로는 분리 불가
  - **코드 변경**: A-1 계측만(승인 예외). `ManagerQualityMetrics.stanceSurvival`에 쟁점당 `{participants, survived}` 쌍을 기록 — §11-4는 stance 0개만 폐기하므로 **참여 3개 중 1개만 죽는 부분 손실이 어디에도 안 잡혔다**(`agendaDropRate` 0, `quoteRejectRate`도 원인이 `quotes: []`면 0). 비율로 뭉개지 않고 쌍 그대로 남긴다. 단계 6 경로 + `single_source`·fallback 경로 모두 기록. 측정용 초안 fixture `three-providers-drafts.json` 커밋(다음 비교 시 단계 3 재실행 불필요)
  - **검증**: 루트 typecheck·lint·build 통과. `--grounding-test` 12/12 + FP 프로브 10건 유지. 파이프라인에 `reasoning` 미적용 확인(하네스 삭제됨)
- **T-019.4 진행 (2026-07-31)** — A~E 완료, F 부분, G n=1, H 미완. 커밋 `6d72ced`(A~C) · `9e99cb7`(D) · `3fe7e98`(E 1/2) · `4dae904`(E 2/2) · `6062c5a`(회귀 2건 수정)
  - **A. 설정 (§2.4·§15.3)**: `MANAGER_JUDGE_TIMEOUT_MS`(100000)·`MANAGER_JUDGE_REASONING_EFFORT`(low)를 **단계 6에만**. 단계 3·4는 45초·무설정 유지
  - **B. 부분 손실 fallback (§7.6·§11.2)**: `fillMissingStances`. `stanceSurvival`은 **보충 전** 값을 기록한다(보충 후를 적으면 손실이 지표에서 사라진다). `stancesFilled` 신설
  - **C. 진행 이벤트 (§12.2)**: `agenda.progress` 신설. 단계 4는 조건부라 실제 호출 분기 안에서만 알린다
  - **D. 재검토 (§10)**: 프롬프트·포트·어댑터·`pipeline/recheck.ts`(§11-8). PATCH `recheck`·`retry_recheck`. §10.6 전이, 실패 시 `recheck_requested` 유지·기회 미소진
  - **E. web 재배선 (§12.5)**: `applyAgendas`를 **Agenda 갱신의 단일 지점**으로 두고 마감 규칙을 거기 하나만 뒀다. 서버 경로에서 `buildMockAgendas` 완전 제거(`?scenario=`에만 잔존). SSE 종료 판정을 `.done` 접미사 규칙으로 교체. `onAcceptStance`가 stance 전체를 넘겨 **서버에는 `sourceRef`만** 보낸다. 서버 경로는 **응답을 받은 뒤** 제거한다(낙관적 제거 시 409를 되돌려야 하고 사용자는 반영됐다고 믿는다)
    - **`recheck_requested` 출구 추가**: 예전에는 `footer = null`이라 **호출 실패 시 스피너만 남고 나갈 버튼이 없었다.** [다시 시도]·[선택한 입장 채택]·[내 결정]·[내용 제외] 넷을 붙였다(결정 11)
    - **`reanswered`에서 "이 결과로 결정" 제거 (§10.1)**: 재검토 답변은 판단 재료이지 답이 아니다. 그 버튼은 재검토 답변이 최종 답변에 들어간다고 읽히는데 실제로는 원문 섹션이 들어가 기대와 어긋난다. 3열에서 입장을 고르게 바꿔 원문이 들어가는 것이 당연해지게 했다
    - **E-4 인용 표시**: "원문 근거 N건" + 인용문 + 출처(`Claude · rec-s2`). 0개면 "원문 인용 없음" 명시 — §10.1이 0개를 허용했으므로 표시가 없으면 근거 없는 것이 근거 있는 것처럼 읽힌다
  - **⚠️ 브라우저 회귀에서 발견·수정한 회귀 2건** (둘 다 E에서 서버 경로를 새로 만들며 Mock 경로에만 있던 처리가 안 옮겨진 것)
    1. **완료가 서버에 영속화되지 않았다** — `markQuestionCompleted`가 Mock 경로에만 있어 화면만 `completed`가 되고 DB는 `review_required`로 남았다. 새로고침하면 되돌아오고 미완료 1개 제약도 안 풀린다. §12.1대로 `applyAgendas`에서 호출하도록 고쳤다
    2. **새로고침 시 Agenda가 복원되지 않았다** — 마운트 복원이 `loadSourceAnswers`만 부르고 `loadAgendas`를 부르지 않았다. §12.3의 GET·adapter는 이미 있었고 배선만 빠져 있었다
  - **F. 브라우저 회귀 (테스트 계정, 실제 3사 + 실제 Manager, 3사 실행 1회/상한 8회)**

    | # | 항목 | 결과 |
    |---|---|---|
    | 1 | 질문→3사→Manager→충돌 해소→FinalAnswer→노트→completed | ✅ 전 구간 |
    | 2 | **진행 표시** | ✅ 3사 완료 후 "쟁점 분류 중…" → "쟁점 판정 중… 1/4". **70초 무음 구간 사라짐** |
    | 3 | 판정 조기 표시 | ⚠️ 이벤트는 건별로 오지만 판정이 4건 중 3건이 60초 이후 몰려 육안으로는 거의 동시에 보였다. 배선은 정상 |
    | 4 | 재검토 | ✅ `reanswered` · `disagreement_type` 보존 · `revised_type` null(1차 타당) · **citations 3건** · `user_accepted_after_recheck` + 실제 `sourceRef` |
    | 5 | 재검토 실패 | ❌ **미수행** |
    | 6 | 새로고침 복원 | ✅ 수정 후 Agenda 복원 확인. FinalAnswer·DecisionNote는 브라우저 Mock이라 복원 안 됨(SPEC-AI-003 범위, 알려진 한계) |
    | 7 | 충돌 0건 | ❌ **미수행** (이번 질문은 충돌 1건이 나왔다) |
    | 8 | 자동 통과 표기 | ✅ 완료 뷰가 **"공통 권장 사항 (3)"**(자동 통과)과 **"결정 사항 · 사용자 판단 우선 적용 (1)"**로 갈렸다 |
    | 9 | `?scenario=` 4종 | ❌ **미수행** |

  - **G. 실측 (n=1, 실사용 경로)** — ⚠️ **분위수 n=1이라 참고값이다**

    | 항목 | 값 |
    |---|---|
    | 단계 6 쟁점당 | 17.5 · 63.6 · 103.0 · 115.1초 → **p50 83.3 · p90 110.7 · 최대 115.1** |
    | 단계 6 출력 토큰 | 901 · 3447 · 5621 · 6321 |
    | 단계 3 | 65.7초 (단계 4 미실행) |
    | Manager 전체 | 약 181초 |
    | **타임아웃 발생** | **0건** — 103.0초·115.1초 호출은 45초였다면 둘 다 타임아웃+재시도였다. §2.4 변경이 실효를 냈다 |
    | `stanceSurvival` | 2/2 · 3/3 · 3/3 · 3/3 — **부분 손실 0건**, `stancesFilled` 0 |
    | `empty_quotes` | **0** — T-019.3.1의 사건이 재현되지 않았다 |
    | `agendaDropRate` | 0% |
    | `quoteRejectRate` | 4.5% (임계 10% 미만) |
    | `disagreementTypeDist` | `main_answer` 1/4 = 25% (임계 5% 상회) |

    **`effort: low` 되돌림 판단은 불가하다.** p50 83.3초가 §14.5의 fixture p50 39.4초보다 나쁘지만 **입력이 다른 실제 질문 n=1**이라 통제된 비교가 아니다. 같은 fixture로 재봐야 판단할 수 있다
  - **H. AC 점검 미완** (F가 부분 수행이라 AC10·AC11·AC12 일부를 닫을 수 없다)
  - **검증**: 루트 typecheck·lint(web만)·build 통과. `--grounding-test` 14/14. 콘솔 오류 없음
- 이후: T-019.4 잔여(F-5·7·9 · G 재측정 · H) → SPEC-AI-003(FinalAnswer) → SPEC-EXPORT-001. BYOK 키 입력 UI는 설정 Spec 후보(SPEC-SETTINGS-001)
- 상시 미결정 4건 중 "계정 삭제"는 DB-001에서 RESTRICT 유지로 최소 확정. 나머지 3건(전 Provider 실패·좌초 복구·단일 SourceAnswer Agenda)은 AI Spec 착수 시 확정
