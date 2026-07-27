# 검증 완료조건 (Acceptance Checklist)

각 Task의 acceptance criteria다. **문서에 적혀 있다는 이유로 체크하지 않는다** — `npm run verify` 통과와 실제 동작 확인으로 충족한 항목만 `[x]`로 바꾼다. 하나의 C 항목이 여러 계층(프론트+API+Notion 등)을 묶으면 전부 충족했을 때만 체크한다.

일일 실행 기록은 [daily-log.md](daily-log.md), Task 목록·상태는 [backlog.md](backlog.md), 계약은 [skills.md](skills.md).

## C01 [T01] Notion 연동 기반
- [x] `app/lib/notion.js`에서 Notion 클라이언트가 환경변수(토큰·DB ID)로 초기화된다
- [x] 임의의 DB에 대해 read/write 헬퍼가 왕복 동작한다 (한 줄 쓰고 다시 읽기 성공)
- [x] 토큰 미설정 시 500이 아니라 사용자에게 온보딩을 안내하는 에러로 처리된다

## C02 [T02] Brain Dump category 확장 + 저장
- [x] `brainDumpSchema`에 `category`가 고정 셋 7개 `z.enum`으로 들어간다
- [x] 분할 결과가 S1 계약(title·estimatedMinutes·category·scheduledDate)대로 반환된다
- [x] 분할된 마이크로스텝이 `scheduledDate`(기본값 오늘)를 포함해 Notion에 저장되고 다시 조회된다

## C03 [T03] One-Focus View 실데이터
- [x] 하드코딩 `task` 문자열이 제거되고 저장된 마이크로스텝을 순서대로 보여준다
- [x] 노션에서 읽어올 때 `scheduledDate`가 오늘 이하인 스텝만 필터링된다
- [x] 한 스텝 완료 시 다음 스텝으로 넘어가고, 마지막 스텝 후 완료 화면으로 간다
- [x] Notion Steps DB에 `Done`(체크박스) 속성이 추가되고, 완료 시 그 스텝이 `Done=true`로 갱신되어 다시 조회해도 유지된다

## C04 [T04] Timer 지속성
- [x] 타이머 도중 새로고침해도 남은 시간이 유지된다 (시작 시각 기준 재계산)
- [x] 타이머 종료 시 정확히 완료 화면으로 전이된다

## C05 [T05] AgentLog DB + 기록 lib
- [x] AgentLog Notion DB가 agent-design.md 스키마(계약 필드 7개 + Notion 필수 title `label` = 8 property)대로 존재한다
- [x] 로그 1건 기록 + 최근 N개 조회 헬퍼가 S3 계약대로 동작한다

## C06 [T06] "힘들어" 루프 판단
- [x] reason_chip·현재 스텝·남은 스텝·최근 로그를 입력받아 S2 계약대로 `proposed_tool`+`reason`을 반환한다
- [x] AgentLog가 빈 상태(cold start)에서도 reason_chip prior로 유효한 tool을 고른다
- [x] 반환 tool이 정의된 8개 중 하나이거나, 후보가 소진되면 `null`(+`final: true`)임을 보장한다 — 어떤 경우에도 `rejectedTools`에 든 값을 `proposedTool`로 재반환하지 않는다 (Solar가 스키마 enum을 무시하고 거절된 tool을 다시 반환하는 사례가 실제로 재현되어, `z.enum` 대신 `z.string()` + 코드 검증·대체로 구현)

## C07 [T07] 재판단 시간 게이트
- [x] `remainingTimeToday > remainingWorkload`일 때만 거절 후 재제안이 나온다
- [x] 시간 부족 시 재제안이 멈추고 마지막 제안 확정 또는 postpone/end로 수렴한다

## C08 [T08] 이유 칩 + 수락/거절 UI
- [x] `onStruggle`이 고정 RestSuggestion이 아니라 이유 칩 → 제안 카드 플로우로 간다
- [x] 제안 카드에 `reason` 한 줄이 노출된다
- [x] 수락/거절이 각각 tool 실행/재판단으로 연결된다

## C09 [T09] outcome 기록
- [x] 스텝 완료 도달 시 해당 pending 로그가 `done`으로 갱신된다 (encourage/shrink_step으로 이어서 완료한 경우, id를 화면 상태로 들고 있다가 갱신)
- [x] 다음 방문(새 Brain Dump 시작) 시 이전 날짜 pending이 일괄 `not_done`으로 마감된다

## C10 [T10] 개인화
- [x] 판단 호출 시 최근 로그(전체 + 같은 category)가 프롬프트에 포함된다
- [x] 같은 tool을 반복 거절한 이력이 있으면 다른 tool을 우선 시도하는 게 관찰된다
- [x] Notion Steps DB에 `ActualMinutes`·`StartedAt`·`CompletedAt`·`PostponeCount` 속성이 추가되고, 스텝 진행에 따라 채워진다
- [x] 판단 호출 시 위 행동 패턴 속성(예상 대비 실제 소요 시간, 미룬 횟수 등)이 프롬프트에 참고 정보로 포함된다

## C11 [T11] Agent 평가
- [ ] "개입했어야 하는 상황" 정답 세트가 파일로 존재한다
- [ ] AgentLog를 읽어 Precision(accepted/전체)·Recall(정답 대비 개입)을 계산하는 스크립트가 수치를 출력한다

## C12 [T12] 화면 디자인 보완
- [x] 타이머 화면에서 남은 시간 비율만큼 물이 차오르는 효과가 실제로 동작한다
- [x] 화면 디자인이 원래 화면 흐름 디자인과 비교했을 때 캐릭터 요소를 포함해 개선된다

## C13 [T13] 모델 비교·결정
- [ ] Solar/GPT-4o-mini/Claude Haiku/Gemini Flash 중 최소 3개 이상에 동일한 입력 문장 5개 이상을 넣어 microsteps 결과를 비교한 기록이 문서로 있다
- [ ] 비교 결과를 바탕으로 어떤 모델을 쓸지 결정하고 근거를 기록했다
- [ ] 결정한 모델이 Solar가 아니면 app/lib/solar.js 및 관련 코드가 그 모델로 교체된다

## C14 [T14] Brain Dump 일정 확인 멀티턴
- [x] 입력한 할 일에 기한이 없으면 되묻는 질문이 생성된다
- [x] 질문·답변이 2턴을 넘기지 않고 scheduledDate 또는 우선순위가 확정된다
- [x] 확정된 값이 Notion에 반영되어 다시 조회했을 때 유지된다

## C15 [T15] 타이머 종료 시 완료 확인 + Agent 판단 연장
- [x] 타이머가 0이 되면 완료 여부를 확인하는 화면이 뜬다
- [x] "아니오" 선택 시 Agent가 연장 분을 판단해 반환하고, 그 시간만큼 타이머가 재시작된다
- [x] 반환된 연장 분이 정수이고, 판단 근거(reason)가 함께 기록된다

## C16 [T16] Brain Dump 음성 입력
- [ ] 마이크 버튼을 누르면 음성 인식이 시작된다
- [ ] 인식된 음성이 텍스트로 변환되어 입력창에 채워진다

## C17 [T17] 마이크로스텝 검토·삭제 화면
- [ ] 쪼갠 마이크로스텝 전체 목록과 각 항목의 카테고리 태그가 화면에 보인다
- [ ] 전체 예상 시간 합계가 표시된다
- [ ] 항목을 삭제할 수 있고, 삭제 후 남은 항목만 Notion에 저장된다
- [ ] "전부 다시 쪼개기" 버튼을 누르면 Brain Dump API를 다시 호출해 새로 쪼갠 결과로 교체된다
- [ ] CompleteScreen이 전체 완료 개수를 보여준다

## C18 [T18] Zero-Input 온보딩 화면
- [ ] 노션 템플릿이 웹에 공유되고 복제가 허용되어 있다
- [ ] 앱 안에서 템플릿 복제 → 토큰/DB ID 붙여넣기 순서를 안내하는 화면을 볼 수 있다

## C19 [T19] 오늘 마감까지 남은 시간 표시 + 연장 버튼
- [ ] 화면에 "오늘 마감까지 남은 시간"과 현재 시각이 함께 보인다
- [ ] 연장 버튼을 누르면 마감 시각이 뒤로 밀리고, 그 값이 이후 remainingTimeMinutes 계산에 반영된다

## C20 [T20] 타이머 일시정지 + 재개 사유 기록
- [x] 타이머 진행 중 일시정지 버튼을 누르면 카운트다운이 멈춘다
- [x] 일시정지 중 이유를 선택적으로 적을 수 있고, 다시 시작을 누르면 멈춘 시간만큼 제외하고 원래 남은 시간부터 이어진다
- [x] 스텝 완료 시 그동안의 일시정지 횟수·이유가 Notion에 기록되어 다시 조회했을 때 유지된다
