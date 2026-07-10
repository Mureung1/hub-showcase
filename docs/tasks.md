# 개발 Task 백로그

## Summary

이 문서는 전자 매니저 키우기 프로젝트에서 개발해야 할 작업을 우선순위와 상태 기준으로 관리한다.

`four-week-roadmap.md`가 4주 동안의 일정표라면, 이 문서는 기능, UI, 문서, 검증, 확장 아이디어를 포함한 전체 작업 목록이다.

## 관리 기준

| 항목 | 의미 |
|---|---|
| P0 | MVP 흐름을 성립시키기 위해 반드시 필요한 작업 |
| P1 | MVP 품질을 높이기 위해 4주 안에 우선 처리할 작업 |
| P2 | 발표, 문서, 사용성 개선에 도움이 되는 작업 |
| P3 | MVP 이후 확장 후보 |

상태는 `예정`, `진행 중`, `완료`, `보류`, `제외`로 관리한다.

## MVP 핵심 Task

| ID | 우선순위 | 상태 | Task | 검증 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-001 | P0 | 예정 | Profile Setup Wizard를 React 화면의 첫 진입 흐름으로 구현 | 프로필이 없으면 마법사가 먼저 뜨고 저장 후 데스크톱으로 이동한다 | user-flow-wireframes.md |
| T-002 | P0 | 예정 | 프로필 입력값을 localStorage에 저장 | 새로고침 후 온보딩이 다시 뜨지 않는다 | mvp-functional-spec.md |
| T-003 | P0 | 예정 | XP Desktop 기본 화면 구성 | 바탕화면, 아이콘, 작업표시줄, 기본 창 2개가 보인다 | user-flow-wireframes.md |
| T-004 | P0 | 예정 | 오늘의 퀘스트 수정 폼 구현 | 제목, 유형, 분량, 난이도를 수락 전에 수정할 수 있다 | mvp-functional-spec.md |
| T-005 | P0 | 예정 | QuestRunner.exe 실행 상태 구현 | 퀘스트 수락 시 실행 창이 열리고 활성 퀘스트가 표시된다 | mvp-functional-spec.md |
| T-006 | P0 | 예정 | 완료 처리와 EXP 증가 구현 | 완료 버튼 클릭 시 EXP와 기록 노트가 갱신된다 | agent-design.md |
| T-007 | P0 | 예정 | 실패 이유 선택 흐름 구현 | 실패 처리 시 이유 선택 창이 뜨고 EXP는 감소하지 않는다 | mvp-functional-spec.md |
| T-008 | P0 | 예정 | 복구 퀘스트 생성 흐름 구현 | 실패 후 더 작은 복구 퀘스트를 제안하고 수락할 수 있다 | agent-design.md |
| T-009 | P0 | 예정 | 기록 노트 리스트 구현 | 완료, 실패, 복구 기록이 구분되어 남는다 | user-flow-wireframes.md |
| T-010 | P0 | 예정 | 매니저 EXP/레벨/대사 상태 갱신 | 완료/실패/복구 상태에 따라 매니저 창의 정보가 바뀐다 | mvp-functional-spec.md |

## UI Interaction Task

| ID | 우선순위 | 상태 | Task | 검증 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-101 | P1 | 완료 | 정적 프로토타입에서 XP 창 드래그 구현 | 제목 표시줄을 잡고 창을 움직일 수 있다 | prototype-static.html |
| T-102 | P1 | 완료 | 창 닫기와 다시 열기 동작 구현 | 닫은 창을 바탕화면 아이콘 또는 작업표시줄 흐름으로 다시 열 수 있다 | prototype-static.html |
| T-103 | P1 | 예정 | React MVP에 창 드래그 동작 이식 | React 화면에서도 창 위치가 마우스를 따라 이동한다 | mvp-functional-spec.md |
| T-104 | P1 | 예정 | 작업표시줄 열린 창 목록 관리 | 열린 창만 작업표시줄에 표시된다 | user-flow-wireframes.md |
| T-105 | P1 | 예정 | 창 z-index active 처리 | 클릭한 창이 다른 창보다 앞으로 올라온다 | mvp-functional-spec.md |
| T-106 | P1 | 예정 | 모바일 화면에서 창 겹침 최소화 | 작은 화면에서 텍스트와 버튼이 겹치지 않는다 | design-system.md |
| T-107 | P2 | 예정 | QuestRunner.exe 메뉴 후보 정리 | File, Quest, Help 메뉴의 역할이 문서화된다 | user-flow-wireframes.md |

## 디자인·에셋 Task

| ID | 우선순위 | 상태 | Task | 검증 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-201 | P1 | 완료 | concept.png 기반 디자인 시스템 정리 | 색, 폰트, 창, 버튼, 작업표시줄 규칙이 문서화되어 있다 | design-system.md |
| T-202 | P1 | 완료 | 배경 에셋을 public/assets에 연결 | 정적 프로토타입에서 background.png가 보인다 | prototype-static.html |
| T-203 | P1 | 예정 | React MVP에 배경 에셋 적용 | React 첫 화면에서도 동일한 배경 감성이 유지된다 | design-system.md |
| T-204 | P2 | 예정 | 전자 매니저 스프라이트 후보 생성 | 매니저가 현실 동물이 아니라 전자 생물로 보인다 | asset-prompts/ |
| T-205 | P2 | 예정 | XP 아이콘 세트 생성 | 오늘의 퀘스트, 매니저, 기록 노트, 프로필 아이콘이 통일된다 | asset-prompts/ |
| T-206 | P3 | 보류 | 레벨업 보상으로 배경/창 테마 교체 | 성장 보상으로 테마가 해금되는 흐름을 설계한다 | future-expansion-plan.md |

## 문서·운영 Task

| ID | 우선순위 | 상태 | Task | 검증 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-301 | P0 | 완료 | 문서 허브 정리 | README에서 주요 문서로 이동할 수 있다 | README.md |
| T-302 | P0 | 완료 | 프로젝트 지식 지도 작성 | 문서 간 관계와 줄기가 한눈에 보인다 | project-knowledge-map.md |
| T-303 | P1 | 완료 | Codex skill 문서화 버전 추가 | docs/codex-skills에서 재사용 가능한 skill 구조를 확인할 수 있다 | codex-skills/ |
| T-304 | P1 | 예정 | Wiki Home 링크 최신화 | Wiki Home에서 기획서, 와이어프레임, 프로토타입 문서로 이동할 수 있다 | docs/README.md |
| T-305 | P1 | 예정 | PR 본문 최신화 | PR에 프로토타입, 문서 구조, skill 추가 내용이 반영된다 | status.md |
| T-306 | P2 | 예정 | 발표용 스크린샷 정리 | PR 또는 발표 자료에 넣을 주요 화면이 준비된다 | status.md |
| T-307 | P2 | 예정 | 학습 키워드 문서 보강 | React 상태, XP CSS, Agent 로직 학습 항목이 정리된다 | learning/ |

## 검증 Task

| ID | 우선순위 | 상태 | Task | 검증 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-401 | P0 | 예정 | npm build 통과 확인 | `npm.cmd run build`가 오류 없이 끝난다 | status.md |
| T-402 | P0 | 예정 | 첫 접속 시나리오 수동 테스트 | 프로필 저장 후 데스크톱으로 이동한다 | user-flow-wireframes.md |
| T-403 | P0 | 예정 | 퀘스트 완료 시나리오 수동 테스트 | 수락 후 완료하면 EXP와 기록이 갱신된다 | mvp-functional-spec.md |
| T-404 | P0 | 예정 | 실패/복구 시나리오 수동 테스트 | 실패 이유 선택 후 복구 퀘스트를 받을 수 있다 | mvp-functional-spec.md |
| T-405 | P1 | 예정 | 문서 링크 점검 | README, docs/README, knowledge map의 링크가 깨지지 않는다 | docs/README.md |
| T-406 | P1 | 완료 | skill 문서 민감정보 점검 | API Key, token, password, 로컬 절대경로가 없다 | codex-skills/ |

## MVP 이후 확장 Task

| ID | 우선순위 | 상태 | Task | 검증 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-501 | P3 | 보류 | 개인 LLM 매니저 연결 설계 | 사용자 기억과 LLM prompt/tool 경계가 분리된다 | future-expansion-plan.md |
| T-502 | P3 | 보류 | 음성 입력 추가 | 텍스트 입력 fallback을 유지한 음성 입력 흐름이 설계된다 | future-expansion-plan.md |
| T-503 | P3 | 보류 | 공개 퀘스트 탐색 설계 | 공개 여부를 끄면 탐색도 비활성화된다 | future-expansion-plan.md |
| T-504 | P3 | 보류 | 웹캠 제스처 탐색 실험 | 마우스/터치 기본 조작을 유지하면서 실험 모듈로 분리된다 | future-expansion-plan.md |
| T-505 | P3 | 보류 | 현실 픽셀화 TV 연출 | 웹캠/이미지 입력을 저장하지 않고 화면 렌더링만 수행한다 | future-expansion-plan.md |

## Roadmap 연결

- `P0`와 `P1` 중 4주 안에 처리할 항목은 `four-week-roadmap.md`에 배치한다.
- 완료 여부와 검증 결과는 `status.md`에 기록한다.
- MVP 이후 기능은 `future-expansion-plan.md`에서 상세 설계를 이어간다.
