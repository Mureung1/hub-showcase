<!--
PR 제목: [N123_이규민] 2주차 주간 계획·GitHub Project·계획 수립 Agent 구축
권장 라벨: documentation
-->

## 주요 작업 리스트

2주차 목표를 하루 단위 작업으로 나누고, 계획 문서·GitHub Issues·Project·계획 수립
Agent가 같은 우선순위와 순서를 가리키도록 구성했습니다.

- **2주차 주간 계획 문서 작성**
  - 기간: 2026-07-13(월) ~ 2026-07-17(금)
  - 금요일 데모 시나리오와 일일 점검 기준 정의
  - `P0/P1/P2`, `S/M`, 요일, 선행 이슈, 완료 기준 명시
  - 문서: [`docs/WEEK2_PLAN.md`](docs/WEEK2_PLAN.md)
- **작업을 GitHub Issues로 등록**
  - [#2 Claude API 실제 요청 검증](https://github.com/dolphin1404/NaverConnect_wm/issues/2)
  - [#3 AI 생성 연결과 결과 비교](https://github.com/dolphin1404/NaverConnect_wm/issues/3)
  - [#4 실패 시 결정적 렌더러 자동 폴백](https://github.com/dolphin1404/NaverConnect_wm/issues/4)
  - [#5 Vitest와 파서 핵심 테스트](https://github.com/dolphin1404/NaverConnect_wm/issues/5)
  - [#6 새 클론 환경 재현과 E2E 데모](https://github.com/dolphin1404/NaverConnect_wm/issues/6)
  - [#7 2주차 계획 대시보드 이슈](https://github.com/dolphin1404/NaverConnect_wm/issues/7)
- **GitHub Project 보드 구성**
  - [CV2PF 2주차 계획](https://github.com/users/dolphin1404/projects/2)
  - 저장소와 이슈 #2~#7 연결
  - `Status`, `Priority`, `Size`, `Day`, `Order` 필드 설정
  - 모든 카드를 `Todo`로 초기화하고 실행 순서 0~5 입력
- **계획 수립 Agent 추가**
  - [`.claude/skills/feature-slice/SKILL.md`](../.claude/skills/feature-slice/SKILL.md)
  - 요구사항을 하루 크기의 세로 조각으로 분해
  - 우선순위·의존성·완료 기준·일정·GitHub 이슈 초안 생성
  - `agents/openai.yaml` 메타데이터와 공식 검증 포함
- **README 연결**
  - 루트 README와 프로젝트 README에서 주간 계획 및 GitHub Project로 이동 가능

## 내가 설명할 수 있는 부분

`feature-slice` Agent의 작업 분해 기준을 설명할 수 있습니다.

큰 기능을 프론트엔드·백엔드처럼 기술 계층으로만 나누면 각 작업이 끝나도 사용자가 확인할 수
있는 결과가 늦게 나옵니다. 그래서 이 Agent는 **사용자에게 검증 가능한 end-to-end 결과**를
우선하고, 한 사람이 하루 안에 끝낼 수 있는 `S/M` 크기로 제한합니다.

이번 계획에서는 가장 불확실한 Claude API 연동을 월요일에 먼저 배치하고, 그 결과를 사용하는
클라이언트 비교 흐름, 외부 API 실패를 막는 자동 폴백, 회귀 테스트, 환경 재현 순서로
의존성을 정했습니다. 또한 P0를 세 개로 제한해 핵심 데모와 직접 연결되는 작업만 필수로
유지했습니다.

완료 기준에는 "구현 완료" 같은 표현 대신 HTTP 상태 코드, 화면 결과, `npm test`,
`npm run build`처럼 실제로 관찰할 수 있는 조건을 사용했습니다. 덕분에 매일 저녁 계획 대비
진행률을 스스로 판단할 수 있습니다.

## 아직 이해 못 한 부분

- GitHub Project의 자동화 규칙으로 이슈가 닫힐 때 `Status=Done`을 동기화하는 세부 설정은
  아직 직접 구성하지 못했습니다. 현재는 이슈 상태와 Project 상태를 수동으로 함께 관리합니다.
- GitHub Projects GraphQL API의 node ID와 field option ID 구조는 CLI로 값을 설정하며
  사용했지만, 스키마 전체와 pagination 동작까지 설명할 수준은 아닙니다.
- 실제 작업 시간이 계획의 `S/M` 추정과 얼마나 일치하는지는 이번 주 회고에서 확인해야 합니다.

## 새로 알게 된 것

- GitHub Issue는 개별 작업과 완료 기준을 기록하고, GitHub Project는 여러 이슈의 상태·요일·
  우선순위를 한 화면에서 관리하는 역할로 나누면 좋다는 점을 알게 됐습니다.
- GitHub CLI에서 Projects를 다루려면 기본 `repo` 권한 외에 `project` 권한이 추가로 필요합니다.
- 주간 P0를 2~3개로 제한하면 일정이 흔들릴 때 무엇을 지켜야 하는지가 분명해집니다.
- 좋은 완료 기준은 작업 내용을 반복하는 문장이 아니라, 명령·응답·화면으로 끝을 증명할 수
  있는 조건이어야 합니다.
- Codex 스킬은 `SKILL.md`의 트리거 설명과 실행 절차뿐 아니라 `agents/openai.yaml` 메타데이터,
  공식 validator 검증까지 갖춰야 재사용하기 쉽습니다.

## 검증

- [x] `feature-slice` 공식 validator 통과 (`Skill is valid!`)
- [x] GitHub Project 공개 상태와 이슈 6개 연결 확인
- [x] Project 카드의 `Status/Priority/Size/Day/Order` 값 확인
- [x] `git diff --check` 통과
