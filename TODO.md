# TODO

## 현재 작업

- PRD 기준으로 실제 제품 구현 범위를 MVP와 Phase 2로 분리한다.
- 정적 프로토타입(`prototype/index.html`, `prototype/styles.css`)을 기준으로 화면·도메인·검증 문서를 맞춘다.
- 다음 구현 전에 생산용 기술 스택과 데이터 저장 방식을 확정한다.

## 다음 작업

1. 실제 앱 스택을 결정하고 ADR을 추가한다.
   - 후보 예시: Next.js/React, FastAPI, SQLite/PostgreSQL, LLM API 연동 방식
   - 결정 전에는 `src/`, `app/`, `server/` 같은 구현 폴더를 만들지 않는다.
2. MVP 도메인 모델을 정의한다.
   - Review, ReplyDraft, StoreProfile, AnalysisReport, ResponseCase
3. 리뷰 분류·답글 생성의 입출력 계약을 먼저 문서화한다.
4. 현재 HTML·CSS 프로토타입의 주요 사용자 흐름을 테스트 체크리스트로 검증한다.
