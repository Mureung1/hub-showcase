# 검증 완료조건 (Acceptance Checklist)

각 Task의 acceptance criteria다. **문서에 적혀 있다는 이유로 체크하지 않는다** — `npm run verify` 통과와 실제 동작 확인으로 충족한 항목만 `[x]`로 바꾼다. 하나의 C 항목이 여러 계층(프론트+API+Notion 등)을 묶으면 전부 충족했을 때만 체크한다.

일일 실행 기록은 [daily-log.md](daily-log.md), Task 목록·상태는 [backlog.md](backlog.md), 계약은 [skills.md](skills.md).

## C01 [T01] Notion 연동 기반
- [ ] `app/lib/notion.js`에서 Notion 클라이언트가 환경변수(토큰·DB ID)로 초기화된다
- [ ] 임의의 DB에 대해 read/write 헬퍼가 왕복 동작한다 (한 줄 쓰고 다시 읽기 성공)
- [ ] 토큰 미설정 시 500이 아니라 사용자에게 온보딩을 안내하는 에러로 처리된다

## C02 [T02] Brain Dump category 확장 + 저장
- [ ] `brainDumpSchema`에 `category`가 고정 셋 7개 `z.enum`으로 들어간다
- [ ] 분할 결과가 S1 계약(title·estimatedMinutes·category)대로 반환된다
- [ ] 분할된 마이크로스텝이 Notion에 저장되고 다시 조회된다

## C03 [T03] One-Focus View 실데이터
- [ ] 하드코딩 `task` 문자열이 제거되고 저장된 마이크로스텝을 순서대로 보여준다
- [ ] 한 스텝 완료 시 다음 스텝으로 넘어가고, 마지막 스텝 후 완료 화면으로 간다

## C04 [T04] Timer 지속성
- [ ] 타이머 도중 새로고침해도 남은 시간이 유지된다 (시작 시각 기준 재계산)
- [ ] 타이머 종료 시 정확히 완료 화면으로 전이된다

## C05 [T05] AgentLog DB + 기록 lib
- [ ] AgentLog Notion DB가 agent-design.md 스키마(7 property)대로 존재한다
- [ ] 로그 1건 기록 + 최근 N개 조회 헬퍼가 S3 계약대로 동작한다

## C06 [T06] "힘들어" 루프 판단
- [ ] reason_chip·현재 스텝·남은 스텝·최근 로그를 입력받아 S2 계약대로 `proposed_tool`+`reason`을 반환한다
- [ ] AgentLog가 빈 상태(cold start)에서도 reason_chip prior로 유효한 tool을 고른다
- [ ] 반환 tool이 정의된 9개 중 하나임을 스키마가 강제한다

## C07 [T07] 재판단 시간 게이트
- [ ] `remainingTimeToday > remainingWorkload`일 때만 거절 후 재제안이 나온다
- [ ] 시간 부족 시 재제안이 멈추고 마지막 제안 확정 또는 postpone/end로 수렴한다

## C08 [T08] 이유 칩 + 수락/거절 UI
- [ ] `onStruggle`이 고정 RestSuggestion이 아니라 이유 칩 → 제안 카드 플로우로 간다
- [ ] 제안 카드에 `reason` 한 줄이 노출된다
- [ ] 수락/거절이 각각 tool 실행/재판단으로 연결된다

## C09 [T09] outcome 기록
- [ ] 스텝 완료 도달 시 해당 pending 로그가 `done`으로 갱신된다
- [ ] 다음 방문(새 Brain Dump 시작) 시 이전 날짜 pending이 일괄 `not_done`으로 마감된다

## C10 [T10] 개인화
- [ ] 판단 호출 시 최근 로그(전체 + 같은 category)가 프롬프트에 포함된다
- [ ] 같은 tool을 반복 거절한 이력이 있으면 다른 tool을 우선 시도하는 게 관찰된다

## C11 [T11] Agent 평가
- [ ] "개입했어야 하는 상황" 정답 세트가 파일로 존재한다
- [ ] AgentLog를 읽어 Precision(accepted/전체)·Recall(정답 대비 개입)을 계산하는 스크립트가 수치를 출력한다
