# 3주차 주간 계획 — 학교 AI API 생성 수직슬라이스

> 기간: 2026-07-20 ~ 2026-07-24  
> GitHub Project: [CV2PF 주간 계획](https://github.com/users/dolphin1404/projects/2)  
> 계획 이슈: [#11](https://github.com/dolphin1404/NaverConnect_wm/issues/11)

## 진도 점검

`feature-verifier` 기준으로 기존 포트폴리오 저장·조회 수직슬라이스는 완료(PASS)다.

- FE: React에서 저장·목록·상세 조회 상태를 처리한다.
- BE: Express가 POST/GET API와 오류 계약을 제공한다.
- DB: Supabase `portfolios` 테이블에 실제 insert/select를 확인했다.
- 통합: 저장 응답으로 목록이 갱신되고 상세 HTML이 iframe에 다시 표시된다.
- 증거: 클라이언트 8개·서버 7개 테스트 및 2026-07-16 실제 DB 데모 기록.

미완성 구간은 AI 생성이다. 서버 `/api/generate`는 있지만 React 생성 화면은 로컬 렌더러만 사용하며, 학교 API 사양도 아직 서버에 반영되지 않았다.

## 주간 목표

금요일까지 `CV와 테마 선택 → React → Express → 학교 AI API → HTML 미리보기 → Supabase 저장·재조회` 흐름을 완성한다. 학교 API나 서버가 실패하면 로컬 렌더러로 자동 복구하고 그 사실을 화면에 표시한다.

## 일정

| 순서 | 요일 | 이슈 | 우선순위 | 크기 | 완료 기준 요약 |
| ---: | --- | --- | :-: | :-: | --- |
| 1 | 월 | [#12 학교 AI API 서버 어댑터](https://github.com/dolphin1404/NaverConnect_wm/issues/12) | P0 | M | 실제 API 응답, 400·502·503 구분, 키 비노출 |
| 2 | 화 | [#13 React 생성 화면 연결](https://github.com/dolphin1404/NaverConnect_wm/issues/13) | P0 | M | `/api/generate` 응답이 미리보기·저장 흐름에 연결 |
| 3 | 수 | [#14 자동 폴백과 안내](https://github.com/dolphin1404/NaverConnect_wm/issues/14) | P0 | S | API 실패에도 로컬 HTML과 안내 표시 |
| 4 | 목 | [#15 생성·파서 회귀 테스트](https://github.com/dolphin1404/NaverConnect_wm/issues/15) | P1 | S | 생성 계약과 CV fixture 테스트, lint 통과 |
| 5 | 금 | [#16 환경 재현·E2E 데모](https://github.com/dolphin1404/NaverConnect_wm/issues/16) | P2 | S | 새 환경 실행, test·lint·build, 데모 증거 기록 |

의존성은 `#12 → #13 → #14 → #15 → #16`이다. 학교 API 사양 확인이 늦어져도 #13과 #14는 mock/실패 응답으로 병렬 개발한다.

## 금요일 핵심 시나리오

1. 샘플 CV와 테마를 선택한다.
2. React가 Express의 `/api/generate`에 CV 원문과 DESIGN.md를 보낸다.
3. 학교 AI API가 만든 HTML을 결과 화면에서 확인한다.
4. 결과를 Supabase에 저장하고 최근 기록에서 다시 불러온다.
5. API 실패를 유도해 로컬 렌더러 폴백과 안내를 확인한다.
6. HTML 다운로드와 `npm test`, `npm run lint`, `npm run build`를 확인한다.

## Feature Slice Agent 점검

기존 `.claude/skills/feature-slice` Agent로 계획을 점검해 다음처럼 조정했다.

- 저장·조회 수직슬라이스는 이미 완료되어 기능 강화의 선행 조건으로 다시 잡지 않았다.
- P0를 서버 계약, React 연결, 실패 복구 세 개로 제한했다.
- 기술 계층별 작업보다 사용자에게 보이는 end-to-end 순서로 배치했다.
- 학교 API 사양 확인을 가장 먼저 두고, 테스트·환경 문서는 기능 연결 뒤에 배치했다.
- 원래 3주차 후보였던 HTML 안전화와 골든 스냅샷은 AI 생성 연결 이후로 미뤘다.

## 범위 조정 규칙

- 학교 API 사양이나 인증 정보가 없으면 #12를 `BLOCKED`로 기록하고, #13·#14를 mock 응답으로 계속 진행한다.
- 일정이 밀리면 #16의 문서 장식을 먼저 줄이되 새 환경 실행과 test·lint·build는 유지한다.
- HTML sanitizer, PDF/DOCX 입력, 공개 배포는 이번 주 범위에서 제외한다.

## 매일 저녁 점검

- 오늘 이슈의 완료 기준을 명령·응답·화면으로 확인했는가?
- 내일 작업의 선행 조건이 준비됐는가?
- 새 위험과 범위 변경을 GitHub 이슈에 기록했는가?
- 저장·조회 기존 수직슬라이스의 회귀가 없는가?
