# Day4 작업 계획

## 오늘의 목표

Day4는 PtoP의 기획과 프로토타입을 바탕으로 이후 개발이 흔들리지 않도록 디자인 기준, 개발 환경, Agent 작업 맥락을 정리하는 날이다.

이번 단계에서는 기능을 더 늘리기보다 다음 세 가지를 확정한다.

- 핵심 기능 화면을 기준으로 한 디자인 시스템
- PtoP 디자인 제작에 사용할 개인 design skill
- React + Express 기반 개발 환경과 Agent 지침 문서

## 마스터클래스 정리 포인트

### 웹 서비스 작동 원리

- Frontend는 사용자가 보는 화면과 입력 흐름을 담당한다.
- Backend는 Repository 분석 요청을 받아 GitHub API 호출, 데이터 가공, 오류 처리를 담당한다.
- DB는 추후 분석 기록, 사용자별 프로젝트 히스토리, 저장된 회고 초안을 보관하는 역할로 확장할 수 있다.
- 현재 MVP는 GitHub 공개 API 중심이지만, 2주차 개발에서는 FE / BE / DB 역할을 나누는 구조를 고려한다.

### Agent 지침문서와 Skill

- Agent에게 바로 구현을 맡기기 전에 문제 정의, 화면 흐름, 디자인 기준, 코드 컨벤션을 문서로 제공한다.
- 반복해서 필요한 판단 기준은 `CLAUDE.md` 또는 `Agent.md`에 적는다.
- 디자인 검토처럼 반복되는 작업은 개인 design skill로 분리해 일관성을 높인다.

## 1. 디자인 시스템

### 사용할 디자인 도구 후보

- Figma: 화면 설계, 컴포넌트 정리, 디자인 시스템 export에 가장 적합하다.
- Claude design: 빠르게 시안을 발산할 때 유용하지만 디자인 시스템 관리에는 한계가 있다.
- Google Stitch: 초기 UI 시안을 빠르게 만들 때 유용하지만, 현재 프로젝트의 로고/색상 반영은 추가 검토가 필요하다.

### 우선 선택

현재 목표가 "개발 Agent에 넣을 수 있는 일관된 디자인 시스템"이므로 Figma를 우선 후보로 둔다.

### 핵심 화면 범위

넓게 여러 화면을 만들기보다, PtoP의 핵심 기능이 드러나는 다음 화면을 꼼꼼히 완성한다.

- Repository URL 입력 화면
- 분석 진행 로딩 화면
- 분석 결과 화면
- 오류 안내 화면

### 디자인 시스템에 정리할 항목

- 색상: 흰색, 검정, 민트 중심의 PtoP 브랜드 컬러
- 타이포그래피: 제목, 본문, 보조 설명, 버튼 텍스트 크기
- 간격: 섹션 padding, 카드 간격, 입력 영역 간격
- 컴포넌트: 입력창, 버튼, 결과 카드, 기여도 바, 로딩 spinner, 오류 메시지
- 상태: 기본, hover, loading, error, empty

## 2. 디자인 제작 Skill 만들기

### Skill 목적

PtoP 화면을 만들거나 수정할 때 다음 기준으로 디자인을 검토하도록 한다.

- 핵심 기능이 첫 화면에서 바로 보이는가?
- 검정색 경계선에 의존하지 않고 부드러운 면과 여백으로 구분되는가?
- 로고, 민트 컬러, 흰색 배경이 일관되게 쓰이는가?
- 입력 → 로딩 → 결과 흐름이 사용자가 바로 이해할 수 있는가?
- 마스코트나 장식 요소가 핵심 정보를 가리지 않는가?

### Skill 초안에 포함할 내용

- PtoP 디자인 원칙
- 사용할 색상과 금지할 색상 사용 방식
- 컴포넌트별 검토 기준
- 모바일/데스크톱 레이아웃 점검 기준
- 디자인 결과를 보고 피드백할 체크리스트

### 반복 방식

1. design skill 초안을 작성한다.
2. 현재 React 페이지와 prototype 페이지에 적용해본다.
3. 의도와 다른 부분을 skill에 피드백으로 추가한다.
4. 디자인 수정 요청 시 같은 skill 기준으로 다시 검토한다.

## 3. 개발 환경 구성

### 기본 스택

- Frontend: React + Vite
- Backend: Express
- API: GitHub REST API
- 문서: Markdown
- 스타일: CSS 또는 CSS Module 방식 우선 검토

### 디렉토리 구조 후보

```text
Project
├─ client/
│  ├─ src/
│  └─ package.json
├─ server/
│  ├─ src/
│  └─ package.json
├─ docs/
├─ prototype/
├─ CLAUDE.md 또는 Agent.md
└─ README.md
```

현재는 React/Vite 프로젝트가 루트에 있으므로, 2주차 개발 시작 전에 다음 중 하나를 결정한다.

- 루트 React 구조를 유지하고 `server/`만 추가한다.
- `client/`, `server/`로 분리하는 구조로 옮긴다.

### 조사할 라이브러리

- Express: API 서버 구성
- cors: FE/BE 로컬 개발 연결
- dotenv: GitHub token 등 환경 변수 관리
- nodemon 또는 tsx: 서버 개발 실행
- concurrently: client/server 동시 실행
- zod 또는 validator: Repository URL 검증

### 컨벤션

브랜치:

- Day 단위 작업 브랜치 사용: `Day4`, `Day5`

커밋 타입:

- `feat`: 기능 추가
- `docs`: 문서 작성/수정
- `style`: UI 스타일 수정
- `refactor`: 동작 변경 없는 코드 정리
- `test`: 테스트 케이스 추가
- `chore`: 환경 설정, 의존성, 빌드 설정

커밋 메시지 예시:

```text
docs: Day4 디자인 시스템 작업 계획 정리

PtoP 핵심 화면 디자인 범위와 React/Express 개발 환경 조사 항목을 문서화한다.
```

### 개발 전에 더 결정할 것

- GitHub API 호출을 client에서 직접 할지, server에서 프록시할지
- GitHub token을 사용할지, 공개 API만 사용할지
- 분석 결과를 저장할 DB가 MVP에 필요한지
- 사용자가 GitHub ID를 직접 입력하게 할지, Repository owner 기준으로 분석할지
- 코드 파일 분석과 AI 요약은 2주차 범위에 포함할지

## Agent 지침 문서에 넣을 내용

`CLAUDE.md` 또는 `Agent.md`에는 다음 내용을 정리한다.

- PtoP 서비스 문제 정의
- 핵심 기능 2개
- MVP에서 제외한 기능
- 디자인 원칙
- 코드 스타일과 커밋 규칙
- FE / BE 역할 분리 기준
- GitHub API 실패 시 임의 결과를 만들지 않는 원칙

## Day4 체크리스트

- [ ] 디자인 도구 최종 선택하기
- [ ] 핵심 기능 화면 4개 범위 확정하기
- [ ] 디자인 시스템 항목 정리하기
- [ ] PtoP design skill 초안 만들기
- [ ] design skill 기준으로 현재 UI 점검하기
- [ ] React + Express 디렉토리 구조 결정하기
- [ ] 필요한 라이브러리와 도입 이유 정리하기
- [ ] 커밋 컨벤션과 브랜치 규칙 정리하기
- [ ] `CLAUDE.md` 또는 `Agent.md` 초안 작성하기
- [ ] README에서 Day4 문서로 접근 가능하게 연결하기
