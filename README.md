# 아맞다! 프로젝트

아맞다!(Amadda)는 저장한 인사이트를 현재 상황에 맞춰 다시 찾게 해주는 개인 인사이트 저장소입니다. 현재 MVP는 Google 로그인과 Supabase 기반 개인 보관함을 사용하며, 모바일 공유·Chrome 확장·웹 입력으로 링크를 먼저 저장한 뒤 선택적으로 남긴 맥락으로 다시 찾아 원문을 여는 경험을 검증합니다. 현재 전환 계획은 [#21](https://github.com/ppre1ude/hub/issues/21), 다중 기기 저장 진행 상황은 [#36](https://github.com/ppre1ude/hub/issues/36), 저장 경험 결정은 [#25](https://github.com/ppre1ude/hub/issues/25)에서 관리합니다.

## 문서 색인

### 제품

- [아맞다! 제품 문서](https://github.com/ppre1ude/hub/wiki) - 제품 지식 전체 안내
- [제품 개요](https://github.com/ppre1ude/hub/wiki/%EC%A0%9C%ED%92%88-%EA%B0%9C%EC%9A%94) - 문제, 사용자와 제품 가치
- [도메인 언어](https://github.com/ppre1ude/hub/wiki/%EB%8F%84%EB%A9%94%EC%9D%B8-%EC%96%B8%EC%96%B4) - 제품에서 함께 사용할 용어
- [현재 MVP](https://github.com/ppre1ude/hub/wiki/%ED%98%84%EC%9E%AC-MVP) - 제품 가설, 핵심 흐름과 범위
- [제품 원칙과 결정](https://github.com/ppre1ude/hub/wiki/%EC%A0%9C%ED%92%88-%EC%9B%90%EC%B9%99%EA%B3%BC-%EA%B2%B0%EC%A0%95) - 제품 판단 기준과 현재 결정
- [제품 학습](https://github.com/ppre1ude/hub/wiki/%EC%A0%9C%ED%92%88-%ED%95%99%EC%8A%B5) - 사용자 근거에서 얻은 학습과 남은 질문

### 실행

- [아맞다! 프로젝트](https://github.com/users/ppre1ude/projects/3) - 작업 상태, 우선순위, 순서와 의존성
- [GitHub 이슈](https://github.com/ppre1ude/hub/issues) - 작업별 사용자 결과, 범위와 완료 기준

### 구현

- [작업 컨텍스트](CONTEXT.md) - 에이전트가 지켜야 할 제품 언어와 현재 제약
- [검색 구현 계약](docs/retrieve.md) - 검색 점수, 정렬, 꺼내보기 결과와 테스트 기준
- [온보딩 기획](docs/onboarding.md) - 기존 로그인 전 화면의 문구와 동작
- [디자인 시스템](DESIGN.md) - 화면 톤, 색상, 타이포그래피와 컴포넌트 규칙
- [WDS 적용 메모](docs/wds-adoption.md) - WDS 컴포넌트 적용 기준과 도입 순서
- [개발 아키텍처](docs/development-architecture.md) - FSD 레이어, import 규칙과 저장 경계
- [Android Capacitor 개발·검증](docs/android-capacitor.md) - Android 공유 저장, OAuth, APK와 에뮬레이터 절차
- [기술 스택 및 라이브러리](docs/tech-stack.md) - 라이브러리 선정 이유와 연결 상태
- [코딩/커밋 컨벤션](docs/coding-commit-conventions.md) - 코드 스타일, 브랜치와 커밋 규칙
- [에이전트 작업 지침](AGENTS.md) - 저장소 작업 규칙

### 참고

- [기획 논의 아카이브](docs/discussion.md) - 초기 논의 배경과 과거 범위
- [외부 기획서](https://semicolon-master.notion.site/plan-md-397f551ebf23800f8700f76301a15ca4)
- [프로젝트 관리 노션](https://semicolon-master.notion.site/AI-Agent-Challenge-396f551ebf238005a7fcfbe20555c4bd)

## 계획 관리

- 위키는 문제, 언어, 핵심 경험, 제품 원칙과 축적된 학습을 설명합니다.
- 이슈는 구현, 실험, 사용자 검증과 향후 기능 후보를 독립된 작업으로 관리합니다.
- [아맞다! 프로젝트](https://github.com/users/ppre1ude/projects/3)는 이슈의 상태, 우선순위, 주차와 의존성을 보여줍니다.
- 저장소 문서는 코드와 함께 바뀌는 데이터, 검색, 아키텍처와 디자인 계약을 관리합니다.

## 스크립트

- `npm install`
- `npm run dev` - Vite와 Express를 함께 실행
- `npm run dev:client` - Vite만 실행
- `npm run dev:server` - Express만 실행
- `npm run build`
- `npm test`
- `npm run lint`
- `npm run format`
- `npm run format:check`
