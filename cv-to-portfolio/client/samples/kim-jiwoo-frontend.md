# 김지우

Frontend Engineer

jiwoo.kim.dev@gmail.com · github.com/jiwoo-kim · 서울 (Seoul, KR)

## Summary

React와 TypeScript 기반의 웹 프론트엔드 개발 3년차입니다. B2C 커머스와 사내 어드민 도메인에서 사용자 대면 화면을 설계·구현했으며, 컴포넌트 재사용성과 렌더링 성능 개선에 관심이 많습니다. 디자인 시스템 도입, 번들 최적화, 테스트 코드 작성 경험이 있고, 백엔드·기획과의 협업 과정에서 API 스펙 조율과 QA 이슈 대응을 주도했습니다.

## Skills

TypeScript, JavaScript (ES2020+), React, Next.js, Redux Toolkit, React Query (TanStack Query), Zustand, HTML5, CSS3, Sass, styled-components, Tailwind CSS, Storybook, Jest, React Testing Library, Vite, Webpack, Git, GitHub Actions, Figma, REST API, Zod

## Experience

### 마켓플러스 (MarketPlus) — Frontend Engineer (2023.03 – 현재)

- 상품 상세·장바구니 페이지를 React Query로 리팩터링하여 중복 API 호출을 줄이고 페이지 최초 데이터 로딩 대기 시간을 약 1.8초에서 1.1초로 단축 (약 38% 개선).
- 이미지 지연 로딩과 코드 스플리팅을 적용해 상품 목록 페이지 초기 JS 번들 크기를 420KB에서 265KB로 감소 (약 37% 축소), Lighthouse 성능 점수 68 → 89.
- 사내 공용 UI 컴포넌트 40여 개를 Storybook 기반 디자인 시스템으로 정리, 신규 페이지 개발 시 UI 구현 시간을 평균 30% 단축.
- 결제 플로우 프론트엔드 개편을 담당해 이탈 구간 로깅을 추가하고 유효성 검증 UX를 개선, 결제 단계 이탈률을 12%p 감소.
- React Testing Library 기반 테스트를 도입해 핵심 결제·장바구니 로직 커버리지를 0%에서 62%로 끌어올려 배포 후 관련 버그 리포트 월평균 9건 → 3건으로 감소.

### 스택브릿지 (StackBridge) — Frontend Developer (2022.01 – 2023.02)

- 물류 파트너용 어드민 대시보드를 React + TypeScript로 신규 구축, 일 사용자 약 300명이 사용하는 주문·배송 관리 화면 12종을 담당.
- 대용량 주문 테이블에 가상 스크롤(react-window)을 적용해 5,000행 렌더링 시 스크롤 프레임 드랍을 해소하고 렌더링 시간을 2.4초 → 0.6초로 개선.
- 반복되던 API 상태 관리 코드를 커스텀 훅으로 추상화해 관련 코드 중복을 약 40% 줄이고 신규 화면 개발 온보딩 시간을 단축.
- 기획·QA와 함께 배포 전 체크리스트를 정비해 릴리스 롤백 건수를 분기당 4건에서 1건으로 감소.

## Projects

- 오픈소스 UI 라이브러리 기여 (react-select): 한글 IME 조합 중 입력값이 초기화되는 이슈를 재현·수정한 PR 병합, 이후 관련 이슈 2건 리뷰 참여.
- 개인 프로젝트 "독서 기록장" (Next.js, TypeScript, Supabase): 도서 검색·독서 진행률 기록 웹앱을 개발·배포. 월 활성 사용자 약 120명, 오픈그래프·SEO 대응으로 검색 유입 비중 45% 확보.
- 사내 해커톤 최적화 도구: 팀 내 반복 작업이던 목업 데이터 생성을 자동화하는 CLI+웹 도구를 제작, 팀원 6명 기준 주간 약 3시간의 수작업 절감.

## Education

- OO대학교 컴퓨터공학과 학사 (2016.03 – 2021.02)
- 프론트엔드 부트캠프 수료 (2021.06 – 2021.12): React·TypeScript 중심 실무 프로젝트 과정, 팀 프로젝트 3회 진행.
