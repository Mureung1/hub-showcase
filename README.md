# hub

독서 집중 모임 플랫폼을 만드는 저장소입니다.

## 프로젝트 방향

- 책을 읽고 싶지만 꾸준히 이어가기 어려운 대학생을 위한 서비스입니다.
- 혼자 읽기보다 함께 읽고, 세션 후 감상과 대화로 연결되는 흐름을 지향합니다.
- 단순 기록 앱이 아니라, 독서 습관과 사람 연결을 함께 다룹니다.

## 핵심 컨셉

- 앱을 켜둔 상태로 정해진 시간 동안 독서 세션에 참여합니다.
- 세션 완료 후에는 짧은 감상, 책 추천, 토론 참여, 상호 평가로 신뢰를 쌓습니다.
- 신뢰도는 배제 기준이 아니라, 더 잘 맞는 독서방을 추천하기 위한 신호로 씁니다.

## 현재 우선순위

- 프론트엔드는 PC 웹 MVP 화면과 빠른 시작 흐름을 먼저 안정화합니다.
- 백엔드는 DB 모델링과 API 계약을 먼저 고정하고, 이후 핵심 API를 구현합니다.
- 모바일 반응형과 앱 전환은 MVP 검증 이후 단계로 둡니다.

## 계획 문서

- 상위 로드맵과 단계별 우선순위는 [프로젝트 Wiki](https://github.com/Tapha-K/hub/wiki)에서 관리합니다.
- 프론트엔드 로드맵은 [Frontend Priority Roadmap](https://github.com/Tapha-K/hub/wiki/Frontend-Priority-Roadmap)을 기준으로 합니다.
- 백엔드 로드맵은 [Backend Priority Roadmap](https://github.com/Tapha-K/hub/wiki/Backend-Priority-Roadmap)을 기준으로 합니다.
- 코드와 함께 유지해야 하는 MVP 구현 상세 문서는 이 저장소에 남깁니다.

## 구현 문서

- [Product PRD](client/docs/product-prd.md): Wiki P0/P1 범위를 PC 웹 MVP 요구사항으로 구체화합니다.
- [Frontend User Flow](client/docs/user-flow.md): MVP 화면 단계와 사용자 흐름을 정리합니다.
- [Click Unit UI Specification](client/docs/click-unit-ui-spec.md): 화면별 클릭, 모달, 상태 변화를 클릭 단위로 정의합니다.
- [Component Implementation Notes](client/docs/component-implementation-notes.md): 컴포넌트별 책임, props/state, handler, 표시 조건을 정리합니다.
- [Docs Archive](client/docs/archive): 토론 기록과 UX 검토처럼 구현 기준은 아니지만 의사결정 근거로 보관할 문서를 둡니다.
