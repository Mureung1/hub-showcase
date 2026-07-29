# 프로젝트 컨텍스트 (AI Agent Challenge)

## 개요
- 참여자: N146_임두희 (github: Urindo-do)
- 주제: **학교생활 알림 에이전트** — "대학생(본인)이 겪는 문제 해결" 카테고리로 최종 확정 (변경 불가)
- 저장소: connect-AIAgentChallenge-26-1/hub (내 fork: Urindo-do/hub)

## 문제 정의
대학 생활 시스템에 아직 익숙하지 않은 신입생이, 등록금 납부·수강신청·자기개발 프로그램
신청처럼 시기별로 챙겨야 할 정보가 학교 이메일·eclass·포털에 흩어져 있어서,
정작 본인에게 필요한 정보를 제때 찾지 못하고 놓친다.

## 핵심 기능 (2개)
1. 다중 소스(이메일, eclass) 알림 통합 수집
2. 개인 맥락 기반 우선순위 필터링 및 요약

## Git / PR 규칙 (★ 항상 지킬 것)
- 이 repo는 참가자마다 원본에 개인 브랜치(N146_임두희)가 이미 할당된 구조.
  **일반적인 fork 방식과 다름.**
- PR의 base는 절대 `main`이 아니라 내 이름 브랜치(`N146_임두희`)여야 함.
- origin remote는 내 fork(`Urindo-do/hub`)를 가리키도록 이미 설정되어 있음
  (원본 repo엔 직접 push 권한 없음).
- push, PR 생성처럼 되돌리기 어려운 작업은 실행 전 항상 나에게 확인받을 것.
- 브랜치명에 한글이 포함돼서, GitHub PR base 수정 UI에서 인코딩 에러가 날 수 있음
  → 문제 생기면 "compare across forks"로 새로 만드는 방식 사용.
- PR은 커밋이 아니라 브랜치를 추적함: 내 열린(미머지) PR이 있는 상태에서
  같은 브랜치에 push하면 새 커밋이 그 PR에 자동 합류됨.
  → push 전에 어제 PR의 머지 여부를 먼저 확인할 것.
    미머지 상태면 push를 보류하거나, 해당 PR 본문에 추가 작업 내용을 병기할 것.

## 디자인 규칙 (★ UI 작업 시 항상)
- 모든 UI 작업 전에 docs/design-system.md를 읽을 것
- 색·간격·글자크기·반경은 docs/prototype/tokens.css의 var()만 사용, 하드코딩 금지
- 새 토큰이 필요해 보이면 추가 전에 기존 토큰으로 해결 가능한지 먼저 검토
- 프로토타입 단위 완료 시마다 docs/prototype/check_tokens.py로 토큰 하드코딩 검증

## 진행 상황
- [x] 기획·조사 완료 (문제정의, S1~S6, IA, 와이어프레임, 채널 실측 — 신뢰 기기 1개월 면제 확인 포함) → docs/plan.md
- [x] 디자인 시스템 (다크+보라 A안) → docs/design-system.md + tokens.css
- [x] 프로토타입 S1~S4 + 화면 연결 완주 → docs/prototype/
- [ ] 2주차: 수직슬라이스 — S2 React 이관 완료(mock) → MSW로 API 흐름 검증 완료(GET/PATCH·로딩·에러) → docs/checklist.md

세부 단위 진행 상황은 docs/checklist.md에서만 관리한다 (이 파일은 마일스톤 요약만 유지).

## 다음 세션 시작 시 참고
- 2주차 2번 착수. 순서는 D-day 계산 TDD(2-1) → Supabase 테이블(2-2) →
  Express(2-3~2-5) → MSW를 실서버로 교체(2-6).
  D-day가 먼저인 이유: 뱃지가 ddayLabel에 의존하는데 그 필드를 DB에 저장하지
  않기로 해서, 계산 로직이 없으면 교체 순간 뱃지 4개가 빈칸이 됨.

## 참고
@README.md
@docs/plan.md
@docs/design-system.md
@docs/checklist.md