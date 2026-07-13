# 2주차 주간 계획

## 이번 주 목표

금요일까지 전국 지역거점 대학가 생활 여건 비교 대시보드의 핵심 MVP를 React 화면에서 확인할 수 있게 만든다.

핵심 범위는 전월세 시세 비교와 지역 CPI 오버레이 시각화다. 상권 밀집도와 교통 접근성은 3주차 작업으로 남긴다.

## 요일별 계획

| 요일 | 목표 | GitHub Issue |
| --- | --- | --- |
| 월요일 오전 | 비교 대상 대학가와 데이터 스키마 확정 | [#732](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/732) |
| 월요일 오후 | 전월세/CPI 샘플 데이터 구조 만들기 | [#733](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/733) |
| 화요일 | 대시보드 기본 레이아웃과 필터 UI 구성 | [#734](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/734) |
| 수요일 | 전월세 시세 비교 차트 구현 | [#735](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/735) |
| 목요일 오전 | 지역 CPI 오버레이 차트 구현 | [#736](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/736) |
| 목요일 오후 | 핵심 인사이트 카드와 요약 문구 작성 | [#737](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/737) |
| 금요일 오전 | 계획 수립 Agent 문서 작성 및 계획 점검 | [#738](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/738) |
| 금요일 오후 | 2주차 결과 QA 및 README 링크 정리 | [#739](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/739) |

## 우선순위

- P0: #732, #733, #734, #735, #736, #739
- P1: #737, #738

## Agent 점검 결과

계획 수립 Agent 관점에서 보면, 이번 주 계획은 데이터 구조를 먼저 고정한 뒤 화면과 차트를 구현하는 순서라 의존성이 자연스럽다.

다만 실제 공공 API 연동을 이번 주에 무리하게 끝내기보다, 먼저 샘플 데이터 기반으로 대시보드 구조를 완성하고 이후 실제 데이터로 교체하는 방식이 더 안전하다. 따라서 2주차 완료 기준은 "실데이터 완전 자동화"가 아니라 "샘플 데이터로 핵심 비교 경험이 동작하는 React 프로토타입"으로 둔다.

## 관련 링크

- [GitHub Issues 대시보드](https://github.com/connect-AIAgentChallenge-26-1/hub/issues?q=is%3Aissue%20author%3Abusandangam%20%5BN056_%EA%B9%80%EC%A7%84%EC%98%81%5D%5B2%EC%A3%BC%EC%B0%A8)
- [계획 수립 Agent 문서](./docs/agents/feature-slice-agent.md)
- [프로젝트 기획서](./PROJECT_PLAN.md)
