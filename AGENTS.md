# 저장소 작업 지침

## 프로젝트 개요

이 저장소는 사용자의 부동산 탐색과 의사결정을 보조하는 React/Vite 기반 웹 서비스를 개발하기 위한 프로젝트다.

실제 서비스의 목적, 주요 기능, 사용자 흐름과 기획 의도는 다음 문서를 기준으로 확인한다.

- `docs/plan.md`
- `docs/project.md`

기능을 구현하거나 기존 동작을 변경하기 전에 관련 기획 문서와 소스 코드를 먼저 확인한다.

기획 문서와 현재 구현이 서로 다를 경우 임의로 한쪽을 선택하지 말고 차이를 사용자에게 설명한다.

---

## 프로젝트 구조

실제 React 애플리케이션은 `frontend/`에 있다.

- `frontend/src/`: React 소스 코드
- `frontend/public/`: 정적 공개 파일
- `frontend/index.html`: Vite HTML 진입점
- `frontend/src/main.jsx`: React 진입 파일
- `docs/`: 프로젝트 기획 및 관련 문서

루트의 `index.html`과 `styles.css`는 초기 프로토타입 또는 정적 자산으로 보인다.

별도의 요청이 없다면 실제 서비스 기능은 `frontend/` 안에서 수정하고, 루트의 프로토타입 파일은 변경하지 않는다.

---
## 기술 스택

현재 프론트엔드는 다음 기술을 사용한다.

- React
- Vite
- JavaScript
- React Router
- CSS
- npm
- Oxlint

실제 설치된 패키지와 버전은 `frontend/package.json`을 기준으로 판단한다.

- TypeScript를 사용하지 않는다.
- 별도 요청 없이 TypeScript로 변환하지 않는다.
- 별도 요청 없이 Next.js나 다른 프레임워크를 도입하지 않는다.
- 기존 CSS 방식을 유지하며 Tailwind CSS 등 새로운 스타일링 도구를 임의로 추가하지 않는다.
- 라우팅은 현재 설치된 React Router를 사용한다.
  
___

## 개발 명령어

프론트엔드 관련 명령은 반드시 `frontend/`에서 실행한다.

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
npm run preview
```
