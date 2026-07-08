# 채용공고 기반 대학생 진로탐색 리서치 에이전트

대학생이 관심 직무를 준비할 때, 샘플 채용공고 데이터를 기반으로 요구 역량을 파악하고 학습 방향과 프로젝트 방향을 정리하도록 돕는 AI Agent 프로젝트입니다.

1주차에는 실제 채용공고 수집이나 LLM API 연동보다 사용자 흐름 검증에 집중합니다. React 내부 mock data와 rule 기반 로직으로 직무 입력, 요구역량 요약, 학습 방향 추천, 프로젝트 아이디어 추천 흐름을 먼저 확인합니다.

## 문서

- [기획서](docs/plan.md): 문제 정의, 타깃 사용자, 핵심 기능, MVP 및 화면 흐름
- [설계 문서](docs/architecture.md): AI Agent 구조, 시스템 흐름, 기술 구조 메모
- [작업 체크리스트](docs/checklist.md): 1주차 React 프로토타입 구현 단위와 검증 시나리오
- [Wiki](https://github.com/joo-hyun/hub/wiki)

## 실행 방법

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm.cmd run dev
```

빌드 확인:

```bash
npm.cmd run build
```

린트 확인:

```bash
npm.cmd run lint
```

PowerShell 실행 정책 때문에 `npm run dev`가 막히는 경우 `npm.cmd run dev`처럼 실행합니다.

## 프로젝트 구조

```text
hub/
  docs/
    architecture.md
    checklist.md
    design-concept.md
    plan.md
    images/

  prototype/
    index.html
    style.css
    assets/

  src/
    internal/
      project-intro/

    product/
      components/
      data/
      pages/
      services/

    shared/
      components/
      utils/

    assets/
    App.jsx
    App.css
    index.css
    main.jsx
```

## 폴더 역할 TODO

- `src/internal/project-intro/`: 프로젝트 소개용 React 화면을 유지합니다.
- `prototype/index.html`: 1주차 HTML/CSS 정적 프로토타입 위치입니다.
- `src/product/`: 이후 실제 서비스 React 구현이 들어갈 위치입니다.

## 현재 구현 상태

- 프로젝트 소개 React 화면 구현
- 기획서 작성
- 설계 문서 분리
- 1주차 React 프로토타입 작업 체크리스트 작성
- 최종 서비스 영역과 내부 산출물 영역 분리

## 아직 구현하지 않은 범위

- Express 서버
- 실제 LLM API 호출
- 실시간 채용공고 크롤링
- DB 저장
- 로그인
- 사용자 역량 기반 Gap 분석

## 향후 계획

- React 기반 1주차 프로토타입 구현
- mock job data 작성
- rule 기반 요구역량 분석 로직 구현
- 학습 방향 및 프로젝트 추천 로직 구현
- Verifier 검토 문구 구현
- 이후 Express API와 LLM API 연동
