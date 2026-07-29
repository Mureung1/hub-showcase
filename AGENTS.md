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

---

## 기능 개발 워크플로우

여러 파일, 상태 관리, 페이지 전환, 데이터 흐름, UI 구조가 함께 바뀌는 기능 개발에는 `.agents/skills/feature-workflow/SKILL.md`를 기준으로 작업한다.

### 사용 대상

- 새 기능이 `pages`, `components`, `hooks`, `utils`, `server` 중 둘 이상에 걸친다.
- 사용자 정보, 매물 업로드, OCR, AI 분석, 저장, 비교, 지도 API처럼 데이터 흐름이 연결된다.
- 라우팅 또는 내부 페이지 전환 구조가 바뀐다.
- UI 구조가 바뀌어 디자인 시스템 검토가 필요하다.

### 사용하지 않는 경우

- 단순 문구 수정
- 단일 CSS 값 변경
- 한 파일 안에서 끝나는 작은 버그 수정
- 코드 설명이나 저장소 분석만 요청받은 경우

### 기본 순서

1. 요구사항을 분석한다.
2. `AGENTS.md`와 관련 기획 문서, 관련 코드를 확인한다.
3. `planner` 서브에이전트로 구현 계획을 만든다.
4. UI 작업이면 구현 전 `ui_reviewer` 검토를 받는다.
5. 사용자에게 계획을 제시하고 승인을 기다린다.
6. 승인 후 메인 에이전트가 직접 구현한다.
7. 구현 후 `code_reviewer`와 필요한 경우 `ui_reviewer`를 병렬 호출한다.
8. 리뷰 결과를 중복 제거하고 심각도순으로 정리한다.
9. 필요한 수정만 메인 에이전트가 수행한다.
10. `frontend/`에서 `npm run lint`와 `npm run build`를 실행한다.
11. 변경 파일, 설계 판단, 검증 결과, 남은 문제를 보고한다.

### 서브에이전트 원칙

- 서브에이전트는 읽기와 검토만 담당한다.
- 실제 구현은 메인 에이전트 하나만 담당한다.
- 여러 에이전트가 동시에 같은 코드를 수정하지 않게 한다.
- 새 라이브러리는 사용자 허락 없이 설치하지 않는다.
- UI 작업에서는 반드시 `docs/design/design-system.md`를 읽는다.
- 모델은 임의로 고정하지 않고 부모 세션 설정을 상속한다.
