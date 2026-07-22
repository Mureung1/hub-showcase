# 7월 30일 최종 로드맵

## Summary

이 문서는 전자 매니저 키우기 프로젝트를 2026년 7월 30일까지 완성하기 위한 상위 계획이다. 목표는 XP 데스크톱형 전자 생물 매니저 웹앱을 기획, 정적 프로토타입, React MVP, FE/BE/DB 수직 슬라이스, 문서/백로그/검증 체계까지 설명 가능한 상태로 만드는 것이다.

`future-expansion-plan.md`는 확장 요구사항의 원천으로 사용한다. 개인화 AI 매니저, 하루의 흐름을 반영하는 web theme, 현실 픽셀화 TV, 공개 퀘스트 탐색, 웹캠 손 제스처, 보상 확장은 기간 내 구현 계획으로 승격하되, 실제 구현 전까지 visible UI에는 노출하지 않는다.

## 최종 목표

- HTML/CSS/JS 정적 프로토타입을 시각 기준안으로 유지한다.
- React + Vite + TypeScript를 실제 구현 타깃으로 유지한다.
- React 화면을 정적 HTML 버전의 XP 데스크톱 품질에 맞게 재정렬한다.
- 2주차 안에 Hono + Supabase 기반 `Quest Event 저장·조회` 수직 슬라이스를 완성한다.
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
- Hono API 라우트 구현
- Supabase `quest_logs` 한 테이블에 Quest Event 저장·조회 구현
- React와 Hono API 실제 연결
- 기능 검증 Agent로 수직 슬라이스 점검

### 3주차: 7월 24일까지

2주차 수직 슬라이스가 끝난 것을 전제로 품질을 높인다.

- React UI를 정적 HTML 기준으로 세부 개선
- XP 창, 작업표시줄, 매니저 창, QuestRunner.exe 스타일 통일
- API 실패/로딩/재시도 UX 보강
- 기록 노트 정렬, 빈 상태, 에러 상태 개선
- 주요 에셋 적용 준비
- 2주차에서 미완료된 수직 슬라이스 항목이 있으면 최우선 처리

- 확장 기능의 데이터/에셋 manifest 설계
- 캐릭터 애니메이션, blink focus scene, 사다리/평지/창탈출 상호작용 prototype, 배경 테마, 창 테마, 기억 조각, 사운드의 web 적용 기반 구현
- 시간대별 web theme 상태 적용
- 매니저 대사 개인화 adapter, Persona 데이터, 제한 선택지 UX, rule fallback 구현
- Quest Event metadata 기반 능력치 성장과 Stage 회귀 보상 구조 설계

### 4주차: 7월 30일까지

- 최종 UI polish
- 모바일 화면 겹침 점검
- README, Wiki, PR, 발표 자료 동기화
- GitHub Issue/Notion 상태 정리
- `npm.cmd run build`와 수동 시나리오 검증
- 발표용 스크린샷과 시연 흐름 정리
- 최종 결과물 정리

- 현실 픽셀화 TV의 로컬 canvas prototype 구현
- Pixel TV 아이콘의 속성/변환 흐름과 single-plane Pepper projection mode prototype 설계
- 공개 퀘스트 탐색 read-only prototype 구현
- 웹캠 손 제스처 탐색 adapter prototype 구현
- 확장 기능은 권한, fallback, 비공개 기본값을 검증한 범위까지만 시연

## 기술 구조

| 영역 | MVP 선택 | 확장 후보 |
|---|---|---|
| Frontend | React + Vite + TypeScript | Canvas/PixiJS 기반 픽셀 월드 |
| Prototype | HTML + CSS + JavaScript | 발표용 정적 시연 유지 |
| Backend | Hono through Vite local middleware | API 모듈 분리, 인증 추가 |
| DB | Supabase `quest_logs` | 프로필, 매니저 기억, 공개 퀘스트 |
| Agent | 규칙 기반 문서/로직 | LLM Adapter, ManagerMemory |
| Asset | PNG/WebP + CSS token | sprite sheet, theme manifest, reward object, audio |

## 2주차 수직 슬라이스 완료 기준

- 화면에서 사용자가 완료/실패/복구를 실행한다.
- React가 Hono API로 요청을 보낸다.
- Hono가 Supabase `quest_logs` 테이블 또는 local memory store에 저장한다.
- React가 API 응답을 받아 기록 노트 화면을 갱신한다.
- 새로고침 뒤에도 서버에서 조회한 기록을 확인할 수 있다.
- API 실패 시 재시도 또는 안내 상태가 보인다.

## 확장 계획 반영

- 개인 LLM 매니저: 기간 내 adapter/fallback prototype, `LLMAgentAdapter`로 분리
- 하루의 흐름 반영: 기간 내 web theme state와 theme manifest 구현
- 웹캠 손 제스처: 기간 내 prototype, 마우스/터치 기본 조작 유지
- 공개 퀘스트 탐색: 기간 내 read-only prototype, 기본 비공개와 신고/차단 정책 필요
- 현실 픽셀화 TV: 기간 내 local canvas prototype, 프레임 저장 금지
- Single-plane Pepper projection mode: Pixel TV 아이콘을 projection 앱 모드로 변환하고 단일면 투명판 반사용 검은 배경/Lumi glow 출력 prototype
- 보상 확장: 기간 내 캐릭터 애니메이션, 외적 성장, 배경/창 테마, 기억 조각, 사운드 적용 기반 구현
- 캐릭터 상호작용: 기간 내 blink focus scene과 사다리/평지/창탈출 prototype을 React/CSS/object state로 검증
- 성장 컨텐츠: Stage 1~4 회귀, 퀘스트 능력치, Persona별 cyber-purr 사운드를 보상/개인화 후보로 반영
- Unity WebGL/TouchDesigner: MVP 본체가 아니라 실험 후보

## 완료 기준

- README에서 전체 계획, 백로그, 오늘 계획, 이번 주 계획, Agent 문서로 이동할 수 있다.
- 2주차 안에 FE-BE-DB 수직 슬라이스가 실제로 동작한다.
- Notion/GitHub Issue에 옮길 수 있는 Task가 정리되어 있다.
- React 개선 방향이 폐기/재작성 논쟁 없이 명확하다.
- 확장 기능은 계획과 백로그에는 있으나 MVP visible UI에는 노출되지 않는다.
