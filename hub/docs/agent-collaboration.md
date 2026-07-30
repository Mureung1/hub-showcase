# Agent 협업 과정

4주간(7/7 기획 시작 ~ 7/31 최종 데모) 기획부터 배포까지 각 단계에서 어떤 도구를 썼고, 무엇을 내가 결정했고 무엇을 AI가 수행했는지 정리한 문서.

## 단계별 도구 사용

| 단계 | 시기 | 사용 도구 | 사람이 결정한 것 | AI가 수행한 것 |
|---|---|---|---|---|
| 기획 | 1주차 이전(7/7~7/10) | 일반 대화(문서 정리) | 문제 정의, 대상 사용자, 기능 A(성분 추천)·B(중복 체크) 동등 우선순위, 3주 일정 | `planning.md`, `green-connect-backlog-v2.md`를 Task 단위(T01~T26)로 구조화, 주차별 일정표 작성 |
| 설계 | 1주차(7/13) | 일반 대화(문서 정리) | DB 테이블(users, diagnoses, ingredients, products, user_supplements) 확정, `any` 금지·새 라이브러리 추가 금지 등 컨벤션 확정(`CLAUDE.md`) | `db-schema.md`, `green-connect-architecture.md` 문서 초안 작성, 마이그레이션 SQL 초안 작성 |
| 구현(정적 UI) | 1주차(7/14~7/17) | design skill | 화면 흐름(IA) 확정, 목업 검증 후 실제 반영 여부 판단 | design skill.css 토큰 기준으로 화면 스타일 일관 적용, 목업 화면 → 실제 컴포넌트 코드 작성 |
| 구현(API 로직) | 2주차(7/20~7/21) | PRD+프롬프트 문서화(예: `prd-T14-*.md`) | Task별 요구사항·API 스펙·완료 기준을 PRD로 직접 작성, 라우터 패턴·제약 조건 지정 | PRD를 참고해 마이그레이션·시딩·API 라우터 구현, 완료 기준 체크 |
| 검증 | 2주차 후반~3주차 | tdd-backend-feature, verify-slice | 어떤 로직에 테스트가 필요한지(예: 출생연도 유효성) 판단, 시나리오 테스트 통과 여부 최종 확인 | 테스트 먼저 작성(Red) → 구현(Green), 화면-API-DB가 실제로 연결됐는지 수직 슬라이스 단위로 자동 검증 |
| 배포 | 3주차(7/27~7/29) | 일반 대화(단계별 디버깅) | 배포 이슈를 "1번부터 하나씩" 순서로 좁혀 요청, 원인 파악 후 최종 조치(Production 브랜치 변경, Render 재연결 등) 승인 | Vercel/Render 로그 확인, 환경변수 누락·Dockerfile 경로 문제 등 원인 진단 및 수정안 제시 |

## 4주 흐름 요약

- **1주차(7/13~7/17)**: 프로젝트 세팅, DB 스키마, 인증 API, 정적 UI 전체 화면(T01~T12) — 목업 데이터로 화면만 넘어가는 수준까지 완성
- **2주차(7/20~7/26)**: 화면은 그대로 두고 실제 계산/매칭 API 연결(T13~T20) — 성분 추천, 성분 중복 체크, 제품 매칭이 실제 DB 기반으로 동작
- **3주차(7/27~7/31)**: 전체 흐름 연결·예외 처리·반응형 다듬기·배포·데모 준비(T21~T26) — Vercel/Render 배포, 배포 환경에서 실제 시나리오 재확인

## 실제와 맞지 않아 고친 부분

기획/문서와 실제 코드가 어긋난 지점은 한 번에 나온 게 아니라 4주 내내 조금씩 발견되고 고쳐졌다.

- **디자인 톤**: 초기(7/9~7/10)엔 라벤더 팔레트로 시작했는데, 7/16에 "디자인 시스템 메인 컬러를 라벤더에서 초록으로 변경" 커밋으로 완전히 바뀜. 그래서 `showcase.json`의 **design-system-lavender**라는 스킬 이름은 실제와 맞지 않아 **design skill**로 바로잡았다.
- **진단 기록 미저장**: `green-connect-architecture.md`(7/22 작성)에서 발견 — `POST /diagnoses` API와 관련 테이블(`diagnoses`, `diagnosis_symptoms`, `diagnosis_ingredients`)이 다 구현돼 있는데 프론트엔드 어디에서도 호출하지 않고 있었음. 이후 `frontend/src/App.tsx`에 `saveDiagnosis` 호출을 연결해 실제로 고쳤다(현재 코드에서 확인됨).
- **로그인 인증 누락**: 같은 문서에서 발견 — PRD(T14)엔 "로그인 사용자만 호출 가능"이라고 적혀 있었는데 실제 구현에서 `/ingredients/recommend`, `/products/check-overlap`, `/products/match` 세 API 모두 `requireAuth`가 빠져 있었음. `/products/match`, `/products/check-overlap`은 먼저 고쳤고, 마지막까지 남아 있던 `/ingredients/recommend`도 `requireAuth`를 추가하고 프론트에서 토큰을 함께 보내도록 수정해 세 API 모두 기획대로 인증이 걸린 상태가 됐다.
- **`user_supplements` 테이블 방치**: 복용 중 영양제를 기록하려고 만든 테이블인데, 실제 중복 체크(`/products/check-overlap`)는 입력한 제품명 문자열을 그때그때 매칭할 뿐 이 테이블을 전혀 쓰지 않음. 지금도 마이그레이션 파일에만 존재하고 코드에서는 참조되지 않는 채로 남아 있다.
- **Explore 사용 여부**: `showcase.json`의 agentTools에 있던 **Explore** 항목은 커밋 로그·작업기록 어디에도 명시적으로 사용한 기록이 없어 확인이 더 필요하다. (배포 디버깅은 Explore 에이전트가 아니라 일반 대화형 디버깅이었다.)
