# SpendMate

기록하는 가계부가 아니라, 소비 습관을 바꿔주는 AI 코치입니다.
영수증을 찍으면 자취생 특화 카테고리로 분석하고, 현재 소비 속도로 생활비가 언제 바닥나는지 예측해 알려줍니다.

## 주요 기능
- 영수증 OCR 자동 인식 및 카테고리 분류
- 생활비 소진일 예측 + 월말 생존 모드
- AI 소비 코치 Agent: 소비 상황을 종합 판단해 레시피 추천 / 최저가 비교를 스스로 선택·실행

## 기술 스택
- **Backend**: Spring Boot (Java)
- **Frontend**: React
- **AI**: Claude API (Tool Use)
- **OCR**: 네이버 클로바 OCR
- **DB**: PostgreSQL

## 문서
프로젝트 기획·설계 문서는 `docs` 폴더 및 위키에서 확인할 수 있다.

- **기획서** ([plan.md](./docs/plan.md)) — 문제 정의, 경쟁 서비스 분석, 핵심 사용자 시나리오, AI Agent 작동 구조, MVP 범위
- **개발 체크리스트** ([checklist.md](./docs/checklist.md)) — 4주 개발 작업을 주차별로 나눈 단위 체크리스트

화면 구성과 프로토타입은 작업 PR에서 확인할 수 있다.