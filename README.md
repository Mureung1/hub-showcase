# 관계형 AI

관계형 AI는 사용자가 자신의 상황과 감정을 입력하면 AI가 공감형 반응이나 후속 질문을 제공하는 웹서비스입니다.

## 해결하려는 문제

사용자는 감정을 표현할 때 공감과 다음 단계를 원하는데, 기존 시스템은 단순한 자동 응답이나 챗봇형 인터페이스로 감정적 연결을 제공하지 못합니다.

## 핵심 사용자 시나리오

1. 사용자가 상황을 입력한다.
2. 사용자가 현재 감정을 선택한다.
3. React 앱이 Express API에 요청을 보낸다.
4. Express 서버가 입력값을 검증한다.
5. 규칙 기반 Mock AI가 공감형 응답과 후속 질문을 생성한다.
6. Supabase에 사용자 입력과 AI 응답을 저장한다.
7. 저장된 결과가 React 대화 화면에 표시된다.

## 핵심 수직 슬라이스

* 사용자 상황 입력
* 감정 선택
* React에서 Express API 호출
* Express에서 입력값 검증
* 규칙 기반 Mock AI 응답 생성
* Supabase에 사용자 입력과 AI 응답 저장
* 저장 결과 반환
* React 대화 화면 갱신

## 기술 스택

* Frontend: React
* Backend: Express
* Database: Supabase
* Supabase SDK: @supabase/supabase-js
* HTTP 요청: fetch
* React 상태 관리: useState
* 초기 AI 응답: 규칙 기반 Mock 응답

## 프로젝트 폴더 구조

```
AGENTS.md
README.md
.gitignore
.env.example
agents/
  relationship-ai-feature-planner.md
docs/
  project-brief.md
  mvp-scope.md
  github-issues.md
frontend/
  .gitkeep
backend/
  .gitkeep
```

## 문서 링크

* [프로젝트 브리프](docs/project-brief.md)
* [MVP 범위](docs/mvp-scope.md)
* [GitHub 이슈](docs/github-issues.md)
* [기능 계획 Agent](agents/relationship-ai-feature-planner.md)
* [AGENTS 규칙](AGENTS.md)

## 현재 개발 상태

현재는 프로젝트 초기 구조만 생성된 상태입니다. React, Express, Supabase 기능 구현은 아직 시작되지 않았습니다.
