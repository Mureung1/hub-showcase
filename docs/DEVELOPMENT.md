# DEVELOPMENT.md

이 문서는 Git, 코딩 컨벤션, 검증 규칙의 단일 원본이다. 사람과 AI 에이전트 모두 이 문서를 기준으로 작업한다.

## 실행

**프론트엔드** (React 19 + TypeScript + Vite, 5173 포트)

```bash
cd frontend
npm install
npm run dev
npm run typecheck
```

**백엔드** (FastAPI + uv, Python 3.13, 8000 포트)

```bash
cd backend
uv sync
uv run fastapi dev app/main.py
```

프론트엔드의 `/api` 요청은 Vite 프록시를 통해 백엔드로 전달된다.

## 브랜치 전략

- `dev`가 개발 기준 브랜치다. 기능 작업은 `dev`에서 브랜치를 따고, 완료되면 `dev`로 병합한다.
- `dev`는 항상 동작하는 상태를 유지한다. 병합 전에 타입 검사와 실행 확인을 마친다.

### 브랜치 이름

`<접두사>/<이슈번호>-<짧은-설명>` 형식으로 짓는다.

```
feat/12-onboarding-interests
fix/23-rss-duplicate-entry
docs/31-db-schema
chore/8-ruff-setup
```

- 접두사는 커밋 접두사와 같은 것을 쓴다: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- 이슈 번호는 GitHub issue 번호를 그대로 쓴다. 대응하는 이슈가 없으면 번호를 생략한다.
- 설명은 영문 소문자 kebab-case로 짧게 쓴다. 한글을 쓰지 않는다.

### PR

- **upstream(루트 저장소)으로 보내는 PR은 사람이 직접 만든다. AI 에이전트는 `git push`와 PR 생성을 하지 않는다.** 커밋까지만 하고 사용자에게 알린다.
- 직접 만든 `.github/` 파일은 커밋하지 않는다. upstream에서 받아온 것만 추적한다.

## 커밋 규칙

- 코드뿐 아니라 문서, 설정 파일 등 저장소 안의 모든 파일 변경은 동일하게 커밋으로 이력 관리한다. "문서라서 대충 커밋"하지 않는다.
- 커밋 메시지는 한글로 작성한다.
- 커밋 메시지 맨 앞에 변경 성격에 맞는 접두사를 붙인다.
  - `feat:` 새로운 기능 추가
  - `fix:` 버그 수정
  - `docs:` 문서 추가/수정 (README, docs/ 폴더 등)
  - `style:` 코드 동작에 영향 없는 포맷팅, 세미콜론, 공백 등
  - `refactor:` 기능 변경 없는 코드 구조 개선
  - `test:` 테스트 코드 추가/수정
  - `chore:` 빌드, 설정, 패키지 등 그 외 잡무성 변경
- 제목은 한 줄로 간결하게 쓰고, 변경 이유나 세부 내용이 필요하면 빈 줄 하나를 띄운 뒤 본문에 목록(`-`)으로 정리한다.
- 하나의 커밋에는 하나의 목적만 담는다. 여러 성격의 변경(예: 기능 추가 + 문서 수정)이 섞이면 커밋을 나눈다.
- 처음 작성하는 파일에는 "정리", "재구성", "개선" 같은 표현을 쓰지 않는다. 이런 표현은 기존 내용을 고친 경우에만 쓴다.

## 커밋하지 않는 것

- 빌드 산출물 (`dist/`, `build/`, `node_modules/`, `__pycache__/`, `.venv/`)
- PDF 파일
- 시크릿이 담긴 `.env`
- design-sync 자동 생성 파일 (`.design-sync/`, `docs/prototype/prototype2/_ds/`)
- 직접 만든 `.github/` 파일

## 코드 작성 규칙

- 절대 모킹하지 않는다. 항상 실제로 동작하는 코드를 작성한다.
- 오버엔지니어링하지 않는다. 요청받은 기능만 구현하고, 요청하지 않은 기능이나 예외 처리를 임의로 추가하지 않는다.
- 함수/변수/파일 이름은 기능을 명확히 나타내도록 짓는다.
- 라이브러리를 새로 추가할 때는 최신 버전을 사용한다. 버전이나 API가 확실하지 않으면 추측하지 말고 공식 문서를 검색해서 확인한다.

## 시크릿과 환경변수

- API 키, 토큰, DB 접속 정보를 코드에 하드코딩하지 않는다. `.env`에 두고 커밋하지 않는다.
- 새 환경변수를 추가하면 `.env.example`에 키 이름과 설명만 남긴다. 실제 값은 넣지 않는다.
- Vite는 `VITE_` 접두사가 붙은 환경변수를 번들에 포함시켜 브라우저에 그대로 노출한다. 프론트엔드에는 공개해도 되는 값(Supabase anon key 등)만 둔다.
- service_role key, DB 접속 정보, 외부 API 시크릿은 백엔드에서만 사용한다. 프론트엔드에 두지 않는다.
- 백엔드 설정은 pydantic-settings로 한 곳에서 읽는다. 코드 곳곳에서 `os.environ`을 직접 읽지 않는다.

## Supabase

- **publishable/secret 키 체계를 사용한다.** legacy `anon`/`service_role` 키를 쓰지 않는다. 인터넷 자료 대부분이 legacy 기준이므로, 참고 코드를 그대로 가져오지 말고 키 이름을 확인한다.

| 용도 | 키 | 환경변수 | RLS |
| --- | --- | --- | --- |
| 프론트엔드 | `sb_publishable_...` | `VITE_SUPABASE_PUBLISHABLE_KEY` | 적용됨 |
| 백엔드 | `sb_secret_...` | `SUPABASE_SECRET_KEY` | **우회함** |

- **publishable/secret 키는 JWT가 아니다.** `Authorization: Bearer`가 아니라 `apikey` 헤더로 보낸다. Bearer에 넣으면 플랫폼이 JWT로 파싱하려다 `Invalid JWT`로 거부한다.
- **secret 키는 RLS를 우회한다.** 백엔드에서 secret 키로 접근할 때는 RLS가 지켜주지 않으므로, 사용자 데이터 접근 시 코드에서 직접 소유자를 확인한다.
- 사용자 단위 데이터(`user_interests`, `mission_records`)는 RLS 정책 `user_id = auth.uid()`로 보호된다. 프론트엔드에서 publishable 키 + 사용자 세션으로 접근한다.

## 네이밍 경계

- DB와 Python은 `snake_case`, TypeScript는 `camelCase`를 쓴다.
- 두 표기법의 변환은 백엔드 응답 스키마(Pydantic)에서 한 번만 한다. 프론트엔드에서 변환하지 않는다.
- 프론트엔드에 `snake_case` 필드가 그대로 넘어오면 프론트를 고치지 말고 백엔드 스키마를 고친다.

## 아키텍처

**데이터는 전부 FastAPI를 거친다. Auth만 예외다.**

```
데이터  프론트 → /api (FastAPI) → Supabase
Auth    프론트 → Supabase (직접)
```

- 프론트엔드는 익명 세션을 만들기 위해 `@supabase/supabase-js`로 Supabase Auth에 **직접** 붙는다. 이 경로가 없으면 토큰을 얻을 방법이 없다.
- 그 외 모든 데이터 요청은 `/api`를 호출한다. 프론트엔드가 Supabase 테이블을 직접 읽거나 쓰지 않는다.
- 프론트엔드는 요청에 `Authorization: Bearer <access_token>`을 실어 보낸다. FastAPI가 토큰을 검증하고 `user_id`를 뽑는다.
- **토큰을 변수에 담아두고 재사용하지 않는다.** access token은 만료되고 `supabase-js`가 갱신하므로, 요청할 때마다 세션에서 꺼낸다.

## API 계약

- 모든 엔드포인트는 `/api` 아래에 둔다.
- 요청/응답은 Pydantic 스키마로 정의한다. `dict`를 그대로 반환하지 않는다.
- **요청 스키마에는 `extra="forbid"`를 건다.** 알 수 없는 필드가 오면 `422`로 거부한다. 조용히 무시하면 잘못된 클라이언트 요청이 드러나지 않는다. **응답 스키마에는 걸지 않는다** (DB에 컬럼이 추가되면 깨진다).
- **`user_id`는 access token에서만 뽑는다.** 요청 본문의 `userId`를 신뢰하지 않는다.
- 프론트엔드에서 쓰는 API 응답 타입은 한 곳에 모은다.
- 프론트엔드는 백엔드 주소를 직접 쓰지 않고 `/api/...` 경로만 호출한다. Vite 프록시가 전달한다.
- 사용자에게 노출하면 안 되는 데이터는 백엔드에서 거른다. 프론트에서 숨기면 **네트워크 응답에는 그대로 실려 나간다** (예: `launch_status`가 `hidden`인 관심사).

## 타입

- TypeScript에서 `any`를 쓰지 않는다. 타입을 모르면 `unknown`으로 두고 좁혀서 쓴다.
- Python 함수에는 인자와 반환 타입 힌트를 붙인다.

## 검증

작업을 마치기 전에 확인한다.

- 프론트엔드 타입 검사: `cd frontend && npm run typecheck`
- 프론트엔드 린트: `cd frontend && npm run lint`
- 구현 완료 판정 기준은 `docs/quality/` 아래 문서를 따른다.
