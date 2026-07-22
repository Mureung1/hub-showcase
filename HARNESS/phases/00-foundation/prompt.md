# Phase 00 — 공통 기반

현재 controller가 지정한 step만 수행한다. manifest의 `allowed_paths` 밖을 수정하지 않고, 비밀값을 파일이나 테스트 fixture에 남기지 않는다. 이 Phase는 기능이 아니라 모든 기능 Phase(01~05)의 전제다.

## 공통 불변조건

- 스택은 `docs/adr/ADR-0002-생산-스택.md`로 이미 채택됐다: React + TypeScript + Vite / 로컬 Supabase(CLI + Docker). 여기서 스택을 새로 결정하거나 바꾸지 않는다.
- 폴더 트리는 기능 위주다. 화면·클라이언트 로직은 `frontend/src/features/<기능>`, 서버 로직은 `supabase/functions/<기능-함수>`와 `supabase/migrations`의 기능별 SQL에 두고, 공용 최소한만 `frontend/src/shared`, `supabase/functions/_shared`에 둔다 (`docs/CODE_MAP.md` 기준).
- 모든 테이블은 RLS로 본인 매장 데이터만 접근하게 한다.
- MVP 입력은 수동뿐이다. 자동 수집·자동 게시·알림처럼 보이는 코드나 문구를 만들지 않는다.
- UI 문구는 한국어 존댓말, 큰 글자, 낮은 정보 밀도를 지킨다 (`docs/UI_GUIDE.md`).

## `stack-scaffold`

빌드 가능한 골격을 만든다: Vite + React + TS 프론트엔드(`frontend/`), `supabase init` 결과(`supabase/config.toml`), 루트 `.env.example`(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, LLM_API_KEY 등 이름만), 루트 통합 테스트 러너(Vitest) 골격과 `test:integration` 스크립트, CI 워크플로 골격. 비밀값은 이름만 남기고 실제 값은 어디에도 쓰지 않는다.

## `auth-review-input-inbox`

Supabase Auth 이메일 가입·로그인(`frontend/src/features/auth`)과 stores·reviews 테이블+RLS 마이그레이션을 만들고, PRD 4.5(리뷰 입력)와 4.3(리뷰함)의 기본을 구현한다. 단건 입력(유입 경로/작성 일자/별점/주문 메뉴/본문/닉네임 선택)과 일괄 붙여넣기의 리뷰 단위 자동 분리·미리보기·일괄 등록, 저장, 리뷰함 목록·페이지네이션·빈 상태("리뷰 입력하러 가기" CTA)를 만든다. 일괄 입력은 원본별 성공/실패를 추적하고 중복·부분 실패를 명시한다. 분류·답글은 이후 Phase 몫이므로 여기서는 저장과 조회까지만 한다.
