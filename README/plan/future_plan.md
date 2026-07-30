# 향후 개발 계획 (v2 후보)

이 문서는 4주차 마감 시점에 "지금 하지 않기로" 확정한 항목을 모은 이관 문서다. `README/plan/Week4_Implementation_Plan.md`의 WBS 원문을 그대로 옮겼다 — 삭제가 아니라 우선순위 재조정이며, 각 항목의 *상세*·*완료 조건*은 계획 당시 문장을 그대로 보존한다.

> **이관 사유 (2026-07-30 결정):** 데모 시연 안정화(배포 확인 · 워크플로 정리 · 리허설)에 남은 시간을 집중하기 위해, 새 기능·모델 고도화·이월 UI·부가 산출물 항목을 v2 이후로 미룬다. 계획서가 이미 예고한 "시간이 부족할 때 버리는 순서(34→33→27→31)"와 같은 방향의 결정이다.

---

## Task 21 잔여분: [Data] mock 전사문 골든셋 라벨 사람 검수

- *현재 상태:* 전사문 5건(`backend/fixtures/interviews/`)과 `hypotheses.json`은 이미 존재하고 Task 22 baseline 측정에도 쓰였다. 다만 각 파일 frontmatter의 `label_source: "AI 초안 판단 (사람 검수 전, 2026-07-27) - 자기참조 위험 있음"`이 그대로 남아 있어, 계획서가 요구한 "정답 라벨은 사람이 직접 판단해 적는다"는 완료 조건을 아직 충족하지 못한다.
- *남은 작업:* 5(6)개 파일의 `expected_status`를 사람이 전사문을 읽고 직접 확정해 `label_source`를 갱신한다.
- *완료 조건:* 모든 fixture의 `label_source`에 "AI 초안" 문구가 사라지고 사람 검수 날짜로 교체된다.

## Task 25: [AI/BE] 1단계 고도화 — 근거 강도(evidence_strength) 도입

- *현재 상태:* 미착수 확인(코드베이스 전체에 `evidence_strength` 0건).
- *상세:* 1단계 출력 스키마에 `evidence_strength` 추가 (`직접 경험` / `의견` / `전언`, Task 23의 위계). `badge_label`(지지/반박/참고)과 직교하는 축이다.
  - *DB:* `evidence_tags.evidence_strength TEXT` 컬럼 추가 (마이그레이션 007). 기존 행은 `NULL` 허용, 백필하지 않는다.
  - *FE:* 사이드 드로어의 근거 표시에 강도 라벨을 함께 노출(기존 팔레트만 사용).
  - *환각 방어:* enum 밖 값은 저장 전 폐기 — `responseValidation.ts`에 검증 추가.
- *완료 조건:* mock `02_contradictory` / `05_noisy`에서 강도가 사람 판단과 일치하게 분류되고, `evidence_tags`에 값이 적재되며, `npm run eval`의 `quote_match_rate`가 baseline 대비 하락하지 않는다.

## Task 26: [AI/BE] 2단계 고도화 — 반증 우선 판정 + 확신도 캘리브레이션

- *현재 상태:* 미착수 확인(`confidence`/`confidence_reason` 0건, `suggested_status`는 Gemini 응답을 그대로 받는 필드일 뿐 애플리케이션 코드의 순수 함수 없음).
- *상세:* `suggested_status` 판정을 "근거 수"에서 "강도 가중합 + 반박 존재 여부"로 교체(애플리케이션 코드의 순수 함수, A/B 실험 없이 코드 쪽으로 바로 구현 — 2026-07-27 결정 유지).
  - `confidence`(높음/보통/낮음) + `confidence_reason`(1문장) 추가 → 마이그레이션 008.
  - `direction`은 원인 축소 / 결과 재정의 / 조건 추가 중 하나를 명시하도록 강제.
- *완료 조건:* mock `03_sparse`에서 `유력함`이 나오지 않고, `01_supportive`에서 `근거 부족`이 나오지 않으며, before/after 지표 표가 기록된다.

## Task 27: [AI/BE] 3단계(리파인) 고도화 — 근거 없는 반박에 대한 정직한 응답

- *현재 상태:* 미착수.
- *상세:* 근거 목록에 사용자 주장을 뒷받침할 내용이 없으면 `reply`에서 근거 부재를 먼저 말하고, `new_summary`는 원 뉘앙스를 유지한 채 표현만 다듬는다.
- *검증 방법:* `02_contradictory` 근거 위에서 근거 없는 반박 입력 시 `new_summary`가 무비판적으로 뒤집히지 않는지 확인.
- *완료 조건:* 결론 방향 유지, `reply`에 근거 부재 명시, `new_citations`가 입력 evidence 안의 id만 참조.

## Task 28 잔여분: [Test/BE] 순수 로직 TDD 확장

- *현재 상태 (2026-07-30, `requirement-verifier` 판정 — Task 39 실사용 기록):* 6개 대상 중 `src/eval/metrics.ts`(`fa2f6a837`→`8bb1518c8`, test→feat 전이 확인) **1건만 PASS**. 나머지는 코드 또는 테스트가 존재하지 않아 **FAIL**:
  - 근거 강도 가중합 / `suggested_status` 결정 함수 — Task 26 자체가 미착수라 대상 코드 없음
  - `recomputeSaveStatus()`(`backend/src/routes/projects.ts:607`) — 함수는 있으나 테스트 0건
  - `sanitizeFilenamePart()`(`backend/src/routes/projects.ts:630`) — 함수는 있으나 테스트 0건
  - 전사문 포맷 계약 검사기 — 기능 자체 미구현
  - `lib/prompts/*`의 `buildUserPrompt()` — 테스트는 있으나 커밋 트레일러가 전부 Task 24 소속이라 Task 28 신규분 여부 NOT VERIFIED
- *남은 작업:* 위 4개 항목에 대해 Red(실패 테스트)→Green 순서로 테스트를 추가한다. Task 25·26이 선행되어야 근거 강도·`suggested_status` 함수 테스트가 의미를 가진다.
- *완료 조건 (원문 유지):* `npm test --prefix backend` 전체 통과, 신규 테스트 파일이 각각 최소 1회 실패→통과 전이를 커밋 이력으로 증명할 수 있음.

## Task 29: [Test/FE] 화면 단위 테스트 도입

- *현재 상태:* 미착수(`Dummy.test.tsx`만 존재, 실제 컴포넌트 테스트 0건).
- *상세:* React Testing Library로 대시보드 배지, `[1]` 마커 파싱(citations 대응 없으면 일반 텍스트), 사이드 드로어, 진행바, 빈 상태를 검증.
- *완료 조건:* `npm test --prefix frontend`에서 실제 컴포넌트 테스트 4개 이상 통과, `Dummy.test.tsx` 제거.

## Task 30: [Test/BE] 공유 라우터 계약 테스트

- *현재 상태:* 미착수(`backend/src/routes/share.ts`에 대응하는 테스트 파일 없음).
- *상세:* `POST`/`PATCH`/`DELETE` `/api/share/:token`이 2xx를 반환하지 않음, 공유 응답 본문에 내부 식별자·쓰기 경로가 노출되지 않음을 회귀 테스트로 고정.
- *완료 조건:* 테스트 통과 및 Week3 Task 17 체크박스를 `[x]`로 전환.

## Task 31: [BE] 비-UTF-8 전사문 업로드 인코딩 대응

- *현재 상태:* 미착수(`jschardet`/`iconv-lite` 의존성 미설치).
- *상세:* `transcriptExtractor.ts`의 `buffer.toString('utf-8')` 고정을 인코딩 감지 → 변환으로 보강.
- *완료 조건:* EUC-KR 한글 `.txt` 업로드 후 전사문이 깨지지 않고 추출되며, 기존 UTF-8 경로에 회귀가 없다.

## Task 32: [FE] 빈 상태(Empty State) UI 처리

- *현재 상태:* 미착수(관련 안내 문구 0건).
- *상세:* 전사문 미입력 / 매칭된 근거 0건 / 검증결과 폴백 고정값 상황에서 "다음 행동"을 제시하는 안내 화면.
- *완료 조건:* 세 가지 빈 상태에서 화면이 깨지지 않고 다음 행동을 안내.

## Task 33: [FE] 버전 히스토리 뷰어

- *현재 상태:* 미착수(FE에 `versions` 관련 코드 없음, 서버 API는 이미 존재).
- *상세:* `GET /api/projects/:id/hypotheses/:hid/versions` 호출해 기존 버전 ↔ 현재 버전 비교 표시.
- *완료 조건:* 원인/결과를 2회 수정한 가설에서 이전 버전 2건이 시간순으로 표시되고 비교된다.

## Task 34: [Docs] Notion 연동 정리

- *현재 상태:* 미착수(계획서 자체가 이미 최우선 드롭 대상으로 지정).
- *상세:* `backend/scripts/exportTasks.ts`로 계획서 파싱 → Task 레코드화, Notion MCP 있으면 upsert / 없으면 `README/Notion_Task_Board.md`에 표 생성.
- *완료 조건:* Week2/3/4 전 Task가 하나의 표로 정리되고 상태·커밋 해시가 붙는다.

## Task 37 후속 측정: 1·2단계 고도화 before/after

- *현재 상태:* Baseline(Task 22)만 기록됨(`backend/eval/results/2026-07-27_2131.json`). 1단계(Task 25)·2단계(Task 26) 이후 지표는 그 두 Task가 이관되어 측정 불가 — 계획서 하단 표의 해당 열은 "—"(미측정)로 남긴다. Task 25·26 착수 시 동일 fixture·동일 측정 방법으로 재측정한다.

---

## 범위 경계 (계획서 원문, 계승)

- **실제 모델 파인튜닝** — 학습 데이터(인터뷰 + 사람의 판정 라벨)가 충분히 축적된 뒤에 검토.
- 정량 데이터 교차 분석 및 그래프
- 인터뷰 질문 생성 기능
- 다중 사용자 / 인증 / 권한
