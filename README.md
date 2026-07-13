## 1) 개요

### (1) 주제명 : Decision Log

### (2) 문제 정의 :

AI로 개발하거나 낯선 기술을 학습하는 사용자는 더 정확한 답변을 얻기 위해 여러 AI에게 같은 질문을 던진다.
하지만 AI마다 답변 형식과 설명 방식이 달라 공통 내용과 서로 충돌하는 내용을 직접 비교하기 어렵다.
또한 여러 답변을 검토한 뒤에도 최종 결론을 다시 정리하고 기록해야 하는 불편이 있다.

### (3) 서비스 개요 :

Decision Log는 하나의 질문을 여러 AI에게 전달하고, 답변을 동일한 구조로 받아 비교하는 서비스다.
Manager AI가 여러 답변에서 공통 내용과 충돌 지점을 추출하며, 사용자는 충돌 내용을 재검색하거나 직접 결정할 수 있다.
모든 충돌이 해결되면 Manager AI가 하나의 최종 답변으로 정리하고, 핵심 결론을 Decision Note로 저장한다.

### (4) 핵심 기능 :

#### (4.1) 여러 AI 답변 비교 기능

하나의 질문을 여러 AI 모델에게 보내고 동일한 형식으로 답변하도록 만든다.
Manager AI가 답변을 문단과 핵심 내용 단위로 비교하여 공통 내용과 충돌 지점으로 정리한다.

#### (4.2) 충돌 해결 및 최종 답변 생성 기능

사용자는 충돌 지점에서 AI별 의견을 확인하고, 재검색, 직접 결정, 내용 제외 중 하나를 선택할 수 있다.
모든 충돌이 해결되면 Manager AI가 공통 내용과 사용자의 결정을 반영해 하나의 최종 답변을 생성한다.

#### (4.3) Decision Note 저장 기능

최종 답변의 핵심 결론과 근거를 하나의 Decision Note로 정리한다.
저장된 노트는 Decision Log에 누적되며, 이후 질문의 컨텍스트나 마크다운 문서로 활용할 수 있다.



# 2. 기획 문서 정리

| 문서명 | 링크 |
|---|---|
| 1. Main 기획서 | https://github.com/lymsla/N132_-/wiki/1.-Main-%EA%B8%B0%ED%9A%8D%EC%84%9C |
| 2. 가치 구조 문서 | https://github.com/lymsla/N132_-/wiki/2.-%EA%B0%80%EC%B9%98-%EA%B5%AC%EC%A1%B0-%EB%AC%B8%EC%84%9C |
| 3. Task List | https://github.com/lymsla/N132_-/wiki/3.-Task-List | 
3.Task List 수정됨



# 3. 기술 스팩 및 내용 정리. 
##React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
