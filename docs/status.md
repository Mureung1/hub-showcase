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
- 단일 SourceAnswer 기반 Agenda 처리 방식과 `resolution_reason` — Manager AI Spec에서 구체화
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
- 이후: SPEC-AI-002~003(Manager·FinalAnswer) → SPEC-EXPORT-001. BYOK 키 입력 UI는 설정 Spec 후보(SPEC-SETTINGS-001)
- 상시 미결정 4건 중 "계정 삭제"는 DB-001에서 RESTRICT 유지로 최소 확정. 나머지 3건(전 Provider 실패·좌초 복구·단일 SourceAnswer Agenda)은 AI Spec 착수 시 확정
