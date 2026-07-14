# Sprint 2 GitHub 작업 계획

## 문서 목적

GitHub Issue와 Project에 등록한 2주차 개발 계획을 저장소 이력에도 남깁니다.
이 문서는 Sprint 2의 작업 범위, Issue 구성, 관리 기준을 추적하기 위한 기록입니다.

## 작업 정보

- 담당자: N091_박창현
- 대상 저장소: `connect-AIAgentChallenge-26-1/hub`
- 작업 브랜치: `N091_박창현`
- 마일스톤: `Sprint 2`
- GitHub Project: [있는대로 프로젝트 2주차](https://github.com/users/pkchanghyun-pixel/projects/1)
- 기록일: 2026-07-14

## Sprint 목표

- 냉장고 재료 등록
- mock 데이터 기반 단일 메뉴 추천
- 추천 메뉴 상세 및 단계별 레시피 확인
- 부족한 재료 및 구매 정보 확인

## 상위 TASK

| TASK | 작업 내용 | GitHub Issue |
|---|---|---|
| TASK 1 | 냉장고에 있는 재료 등록 | [#2](https://github.com/pkchanghyun-pixel/hub/issues/2) |
| TASK 2 | mock 데이터 기반 보유 재료 단일 메뉴 추천 | [#3](https://github.com/pkchanghyun-pixel/hub/issues/3) |
| TASK 3 | mock 데이터 기반 추천 메뉴 상세 및 레시피 확인 | [#4](https://github.com/pkchanghyun-pixel/hub/issues/4) |
| TASK 4 | 부족한 재료 확인 및 구매 정보 안내 | [#5](https://github.com/pkchanghyun-pixel/hub/issues/5) |

## Issue 구성

| 구분 | Issue 수 |
|---|---:|
| 상위 TASK | 4 |
| TASK 1 세부 작업 | 6 |
| TASK 2 세부 작업 | 11 |
| TASK 3 세부 작업 | 9 |
| TASK 4 세부 작업 | 10 |
| 합계 | 40 |

모든 Issue 제목에는 담당자를 식별할 수 있도록 `[N091_박창현]` 접두사를 사용합니다.
세부 Issue 본문에는 관련 TASK와 `Parent: #번호`를 명시하고, 상위 TASK 본문에는 실제 세부 Issue 체크리스트를 연결합니다.

## 분류 기준

- Sprint: `Sprint 2`
- TASK: `TASK 1`, `TASK 2`, `TASK 3`, `TASK 4`
- 작업 영역: `FE`, `BE`, `DB`, `Mock`, `Test`
- 예외 처리: `Error Handling`
- 상위 계획: `Planning`

## Project 관리 기준

Project의 Status는 다음 세 단계로 관리합니다.

- `작업 중`: 현재 Sprint에서 진행하는 작업
- `다음 작업`: 다음 Sprint에서 진행할 작업
- `백로그`: 일정이 정해지지 않은 작업

Sprint 필드는 `Sprint 2`, `Sprint 3`, `미정`으로 구분합니다.
이 문서 작성 시점의 40개 Issue는 모두 `작업 중`, `Sprint 2`로 등록되어 있습니다.

## 이번 Sprint 제외 범위

- 실제 메뉴 데이터베이스 구축
- 외부 레시피·영양·가격 API 연동
- 복수 메뉴 조합 추천
- 실제 상품 가격 비교
- 장바구니 및 결제 기능

## 이력 관리 원칙

GitHub Issue, Label, Milestone, Project 변경은 Git 커밋에 포함되지 않습니다.
따라서 Sprint 계획이 변경될 때 이 문서도 함께 갱신하여 Issue 관리 내역과 저장소 커밋 이력을 연결합니다.
