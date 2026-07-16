# CareerSignal

CareerSignal은 채용공고를 역산해, 직무·기업군이 실제로 원하는 수준을 드러내고 그에 맞춰 무엇을 준비할지 알려주는 대학생 진로탐색 리서치 에이전트입니다. 기술 이름을 나열하는 데 그치지 않고, baseline 대비 편차로 인재상을 읽어 자소서·포트폴리오·면접에 무엇을 담을지, 그리고 그것을 채울 학습·프로젝트 로드맵을 제안합니다.

## 데모

- [정적 프로토타입 보기](https://careersignal-prototype.vercel.app/)
- 정적 프로토타입은 최근 1년의 백엔드 신입·주니어 공고 30건을 가정한 mock 리서치로 구성했습니다. 실제 채용공고 수집이나 AI 분석 결과가 아닙니다.

## 문서

- [기획서](docs/plan.md): 문제 정의, 사용자, 프로토타입과 제품 확장 계획
- [설계 문서](docs/architecture.md): 프로토타입과 MVP의 기술 구조, 데이터 설계, 에이전트 구조
- [디자인 컨셉](docs/design-concept.md): 확정된 화면 구조와 정보 위계
- [디자인 토큰](docs/design-tokens.md): `prototype/style.css`와 동기화하는 시각 토큰
- [작업 체크리스트](docs/checklist.md): 프로토타입 완료 기록과 실제 제품 백로그
- [개발 백로그](docs/backlog.md): 우선순위, 4주 개발 로드맵, MVP Task
- [Wiki](https://github.com/joo-hyun/hub/wiki)

## 프로젝트 관리

- [작업 보드 (GitHub Projects)](https://github.com/users/joo-hyun/projects/2): 주차별 이슈 등록과 진행 상태를 관리합니다.

## 실행 및 확인

### 정적 프로토타입

`prototype/index.html`을 브라우저에서 열면 됩니다. 다섯 페이지는 HTML/CSS만 사용하며 `prototype/style.css`를 공유합니다. 별도 설치, 개발 서버, JavaScript가 필요하지 않습니다.

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
    index.html      (01 직무 선택)
    report.html     (02 통계 분석)
    reverse.html    (03 인재상 역산)
    checklist.html  (04 합격 조건)
    roadmap.html    (05 준비 로드맵)
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
- HTML/CSS 기반 정적 프로토타입 5페이지(직무 선택·통계 분석·인재상 역산·합격 조건·준비 로드맵)
- 고정 상단바(STEP n/5), 오른쪽 글래스 목차, 반응형 본문 레이아웃
- 통계·역산(baseline·편차·신뢰도)·합격 조건 체크리스트·4단계 로드맵 정보 구조
- Vercel 정적 배포

## 아직 구현하지 않은 범위

- 실제 React 기반 직무 입력과 결과 상태 관리
- mock job data 조회와 rule 기반 분석 로직
- Express API, 실제 채용공고 수집, LLM API 연동
- DB 저장, 로그인, 사용자 역량 기반 Gap 분석

## 다음 단계

1. `product/`에 5화면 React MVP와 상태 관리를 구현합니다.
2. `server/`에 백엔드 샘플 공고·rule 통계·분석 API를 추가합니다.
3. FastAPI·LangGraph 기반 역산 에이전트를 붙여 baseline 대비 편차·합격 조건·로드맵을 생성합니다.
