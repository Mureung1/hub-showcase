# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# 에셋 사용 현황

## 사용 중
- login-bg.png, login-character.png → 로그인 화면
- onboarding-dating.png, onboarding-roommate.png → 온보딩 분기 화면
- roommate-type-friend.png, roommate-type-business.png → 룸메 세부분기 화면
- logo-icon.png, logo-full.png → 헤더/파비콘

## 미사용 (제작했으나 폐기)
- 생활성향 4종 일러스트 (기상시간, 청소 등) → 텍스트 카드 패턴으로 전환되어 미사용
- 추가 제작 예정이었던 8종 (자주청소, 가끔청소 등) → 제작 취소

## 텍스트 카드로 대체됨
- 취미발견 6문항, 이상형 7문항, 생활성향 9문항 전체 → 일러스트 없이 문항 리스트 카드 패턴