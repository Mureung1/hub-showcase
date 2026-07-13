# 7월 30일 최종 로드맵

## Summary

이 문서는 전자 매니저 키우기 프로젝트를 2026년 7월 30일까지 완성하기 위한 상위 계획이다. 목표는 XP 데스크톱형 전자 생물 매니저 웹앱을 기획, 정적 프로토타입, React MVP, FE/BE/DB 수직 슬라이스, 문서/백로그/검증 체계까지 설명 가능한 상태로 만드는 것이다.

`future-expansion-plan.md`는 현재 구현 범위가 아니라 장기 확장 요구사항의 원천으로 사용한다. LLM, 음성 입력, 웹캠 제스처, 공개 퀘스트, 현실 픽셀화 TV, 테마 보상은 지금 visible UI에 넣지 않고 구조와 백로그에만 반영한다.

## 최종 목표

- HTML/CSS/JS 정적 프로토타입을 시각 기준안으로 유지한다.
- React + Vite + TypeScript를 실제 구현 타깃으로 유지한다.
- React 화면을 정적 HTML 버전의 XP 데스크톱 품질에 맞게 재정렬한다.
- 2주차 안에 Express + Supabase 기반 `퀘스트 기록 저장·조회` 수직 슬라이스를 완성한다.
- 계획 수립 Agent, 기능 검증 Agent, 문서 관리 Agent를 개발 흐름에 사용한다.
- Notion과 GitHub Issue에 옮길 수 있는 백로그를 유지한다.

## React vs HTML 결정

| 항목 | 역할 |
|---|---|
| `public/prototype-static.html` | 시각 목표와 클릭 흐름의 기준안, 발표/시연용 |
| React 구현 | 실제 확장 구현 타깃, 상태 관리와 API 연동 대상 |

결론: React를 폐기하지 않는다. 정적 HTML의 화면 구조, 창 열림, 버튼 흐름, XP 스타일을 React 컴포넌트로 이식하고, 기존 React의 프로필/퀘스트/완료/실패/복구 상태 전이 로직은 선별 재사용한다.

## 주차별 계획

### 1주차: 7월 10일까지

- 기획서, 사용자 흐름, 와이어프레임 정리
- HTML/CSS/JS 정적 동작 프로토타입 제작
- XP 디자인 시스템 정리
- 에셋 프롬프트 구조화
- 문서 허브와 프로젝트 지식 지도 작성
- Codex skill 문서화 버전 추가

### 2주차: 7월 17일까지

- 계획 수립 Agent 작성
- 기능 검증 Agent 작성
- 문서 관리 Agent 작성
- Notion/GitHub Issue 백로그 구조 확정
- GitHub Issue 등록
- Notion 대시보드 Task 등록
- React 핵심 화면을 컴포넌트와 state로 정리
- mock 데이터로 완료/실패/복구 기록 흐름 확인
- Express API 라우트 구현
- Supabase `quest_logs` 한 테이블에 저장·조회 구현
- React와 Express API 실제 연결
- 기능 검증 Agent로 수직 슬라이스 점검

### 3주차: 7월 24일까지

2주차 수직 슬라이스가 끝난 것을 전제로 품질을 높인다.

- React UI를 정적 HTML 기준으로 세부 개선
- XP 창, 작업표시줄, 매니저 창, QuestRunner.exe 스타일 통일
- API 실패/로딩/재시도 UX 보강
- 기록 노트 정렬, 빈 상태, 에러 상태 개선
- 주요 에셋 적용 준비
- 2주차에서 미완료된 수직 슬라이스 항목이 있으면 최우선 처리

여유가 있으면 확장 계획에서 아래 항목을 가져온다.

- 배경/창 테마 보상 기초 설계
- 주간 리포트 초안
- 매니저 대사 개인화 규칙 개선

### 4주차: 7월 30일까지

- 최종 UI polish
- 모바일 화면 겹침 점검
- README, Wiki, PR, 발표 자료 동기화
- GitHub Issue/Notion 상태 정리
- `npm.cmd run build`와 수동 시나리오 검증
- 발표용 스크린샷과 시연 흐름 정리
- 최종 결과물 정리

여유가 있으면 확장 계획에서 아래 항목을 가져온다.

- 개인 LLM 문장화 실험
- 음성 입력 실험
- 공개 퀘스트 탐색 설계
- 현실 픽셀화 TV 기술 검토

## 기술 구조

| 영역 | MVP 선택 | 확장 후보 |
|---|---|---|
| Frontend | React + Vite + TypeScript | Canvas/PixiJS 기반 픽셀 월드 |
| Prototype | HTML + CSS + JavaScript | 발표용 정적 시연 유지 |
| Backend | Express | API 모듈 분리, 인증 추가 |
| DB | Supabase `quest_logs` | 프로필, 매니저 기억, 공개 퀘스트 |
| Agent | 규칙 기반 문서/로직 | LLM Adapter, ManagerMemory |
| Asset | PNG/WebP + CSS token | 테마 보상, 스프라이트 시트 |

## 2주차 수직 슬라이스 완료 기준

- 화면에서 사용자가 완료/실패/복구를 실행한다.
- React가 Express API로 요청을 보낸다.
- Express가 Supabase `quest_logs` 테이블에 저장한다.
- React가 API 응답을 받아 기록 노트 화면을 갱신한다.
- 새로고침 뒤에도 서버에서 조회한 기록을 확인할 수 있다.
- API 실패 시 재시도 또는 안내 상태가 보인다.

## 확장 계획 반영

- 개인 LLM 매니저: P3, `LLMAgentAdapter`로 분리
- 음성 입력: P3, 텍스트 fallback 필수
- 웹캠 손 제스처: P3, 마우스/터치 기본 조작 유지
- 공개 퀘스트 탐색: P3, 기본 비공개와 신고/차단 정책 필요
- 현실 픽셀화 TV: P3, 프레임 저장 금지
- 테마 보상: P3, 배경/창 스킨 해금 구조로 설계
- Unity WebGL/TouchDesigner: MVP 본체가 아니라 실험 후보

## 완료 기준

- README에서 전체 계획, 백로그, 오늘 계획, 이번 주 계획, Agent 문서로 이동할 수 있다.
- 2주차 안에 FE-BE-DB 수직 슬라이스가 실제로 동작한다.
- Notion/GitHub Issue에 옮길 수 있는 Task가 정리되어 있다.
- React 개선 방향이 폐기/재작성 논쟁 없이 명확하다.
- 확장 기능은 계획과 백로그에는 있으나 MVP visible UI에는 노출되지 않는다.