# 1. 프로젝트 주제
## 1) 개요
(1) 주제명 : Decision Log

(2) 문제 정의 : 
- AI로 개발하거나 낯선 기술을 학습하는 사용자는 여러 AI에게 같은 질문을 던진다.
- 하지만 답변 형식과 설명 순서가 달라 공통점, 충돌점, 검증할 내용을 비교하기 어렵다.

(3) 서비스 개요 :
- Decision Log는 여러 AI의 답변을 동일한 구조로 받아 문단 단위로 비교해주는 서비스다.
- 공통 내용, 충돌 내용, 검증 필요사항을 카드로 정리하고 사용자의 판단을 기록으로 남긴다.

(4) 핵심 기능 :

(4.1) 여러 AI 답변 비교 기능
- 하나의 질문을 여러 AI 모델에게 보내고, 동일한 형식으로 답변하도록 만든다.
- Manager AI가 답변을 문단 단위로 나누어 공통 내용, 충돌 내용, 검증 필요사항으로 정리한다.

(4.2) Decision Log 저장 기능
- 비교 결과를 카드로 보여주고, 사용자가 각 카드를 채택, 검증 필요, 폐기 상태로 분류한다.
- 저장된 판단은 Decision Log로 누적되며 이후 질문의 컨텍스트나 마크다운 문서로 활용할 수 있다.



# 2. 기획 문서 정리

| 문서명 | 링크 |
|---|---|
| 1Pager | Decision Board AI |



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
