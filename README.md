# hub
>>>>>>> f630a53 (docs: README 개발 과정 업데이트)

# 1일차 - PlaceSync React 프로젝트

PlaceSync의 화면을 구현한 React 프로젝트입니다.

## 실행 방법

React 프로젝트 폴더로 이동합니다.

```bash
cd react
```

필요한 패키지를 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

PowerShell에서 실행 정책 오류가 발생하는 경우 다음 명령을 사용합니다.

```bash
npm.cmd install
npm.cmd run dev
```

개발 서버가 실행되면 브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:5173
```

## 주요 구현 내용

* Vite 기반 React 개발 환경 구성
* 프로젝트 주제 소개 화면 구현
* `ProjectIntro` React 컴포넌트 작성
* 실시간 기상 변화 알림 서비스 아이디어 소개
* 택시 동승자 매칭 서비스 아이디어 소개

## 주요 파일

```text
react/ 
├─ src/
│ ├─ components/
│ │ └─ ProjectIntro.jsx
│ ├─ App.jsx 
│ └─ main.jsx 
├─ index.html 
├─ package.json 
└─ vite.config.js
```

# 2일차 - 주제 선정 및 기획 시작

## 프로젝트 문서

프로젝트의 기획 및 개발 관련 문서는 아래 링크를 통해 확인할 수 있습니다.

* [프로젝트 기획서](./docs/plan.md)

* [보조 자료](./docs/feature-spec.md)

* [개발 작업 체크리스트](./docs/checklist.md)

# 3일차 - 기획서 완성 및 프로토타이핑
