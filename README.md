# CareerSignal

채용공고에 반복되는 요구사항을 분석해 취업 준비 우선순위를 정리하는 대학생 진로탐색 프로젝트입니다. 기술 이름을 나열하는 데 그치지 않고, 기술을 어느 구현 범위까지 다뤄야 하는지, 필수 요구사항과 우대사항을 어떻게 구분할지, 기업군별로 어떤 프로젝트 경험을 강조할지를 제안합니다.

## 데모

- [정적 프로토타입 보기](https://careersignal-prototype.vercel.app/)
- 정적 프로토타입은 최근 3개월의 주니어 프론트엔드 공고 24건을 가정한 mock 리서치로 구성했습니다. 실제 채용공고 수집이나 AI 분석 결과가 아닙니다.

## 문서

- [기획서](docs/plan.md): 문제 정의, 사용자, 프로토타입과 제품 확장 계획
- [설계 문서](docs/architecture.md): 현재 정적 프로토타입과 향후 제품 구조의 구분
- [디자인 컨셉](docs/design-concept.md): 확정된 화면 구조와 정보 위계
- [디자인 토큰](docs/design-tokens.md): `prototype/style.css`와 동기화하는 시각 토큰
- [작업 체크리스트](docs/checklist.md): 프로토타입 완료 기록과 실제 제품 백로그
- [개발 백로그](docs/backlog.md): 우선순위, 4주 개발 로드맵, MVP Task
- [Wiki](https://github.com/joo-hyun/hub/wiki)

## 프로젝트 관리

- [작업 보드 (GitHub Projects)](https://github.com/users/joo-hyun/projects/2): 주차별 이슈 등록과 진행 상태를 관리합니다.

## 실행 및 확인

### 정적 프로토타입

`prototype/index.html`을 브라우저에서 열면 됩니다. 세 페이지는 HTML/CSS만 사용하며 `prototype/style.css`를 공유합니다. 별도 설치, 개발 서버, JavaScript가 필요하지 않습니다.

### 프로젝트 소개 React 화면 (`project-intro/`)

프로젝트 소개 페이지 전용 독립 Vite 환경입니다. 실제 서비스와 코드를 공유하지 않습니다.

```powershell
cd project-intro
npm install
npm.cmd run dev
```

빌드와 린트는 아래처럼 확인합니다.

```powershell
npm.cmd run build
npm.cmd run lint
```

### 실제 제품 React 화면 (`product/`)

실제 서비스 React 코드를 위한 독립 Vite 환경입니다.

```powershell
cd product
npm install
npm.cmd run dev
```

빌드와 린트는 아래처럼 확인합니다.

```powershell
npm.cmd run build
npm.cmd run lint
```

PowerShell 실행 정책으로 `npm run ...`이 막히면 `npm.cmd run ...`을 사용합니다.

## 프로젝트 구조

```text
hub/
  docs/
    architecture.md
    checklist.md
    design-concept.md
    design-tokens.md
    plan.md

  prototype/
    assets/
    index.html    (01 관심 직무 선택)
    report.html   (02 요구사항 분석 보고서)
    roadmap.html  (03 학습 로드맵)
    style.css

  project-intro/              (독립 Vite+React 앱: 프로젝트 소개 화면)
    package.json
    vite.config.js
    index.html
    src/

  product/                    (독립 Vite+React 앱: 실제 서비스 화면)
    package.json
    vite.config.js
    index.html
    src/
      pages/
      data/
      components/
      services/

  server/                     (product 전용 Express 서버, 독립 실행 환경)
```

`prototype/`, `project-intro/`, `product/`, `server/`는 각자 독립 실행 환경입니다. 서로 코드나 `node_modules`를 공유하지 않으며, 한쪽을 수정해도 다른 쪽 실행에 영향을 주지 않습니다.

## 현재 구현 상태

- CareerSignal 프로젝트 소개 React 화면
- HTML/CSS 기반 정적 프로토타입 3페이지
- 고정 상단바, 오른쪽 글래스 목차, 반응형 본문 레이아웃
- 요구사항 분석 보고서와 4단계 학습 로드맵 정보 구조
- Vercel 정적 배포

## 아직 구현하지 않은 범위

- 실제 React 기반 직무 입력과 결과 상태 관리
- mock job data 조회와 rule 기반 분석 로직
- Express API, 실제 채용공고 수집, LLM API 연동
- DB 저장, 로그인, 사용자 역량 기반 Gap 분석

## 다음 단계

1. 와이어프레임을 작성해 실제 제품의 화면 전환과 상태를 설계합니다.
2. `product/`에 React 기반 MVP를 구현합니다.
3. `server/`에 Express API와 분석 데이터 흐름을 추가합니다.
