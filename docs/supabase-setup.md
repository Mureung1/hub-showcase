# Supabase 단일 테이블 설정

## 결론

현재 저장 구조는 `public.emotion_analyses` 테이블 하나를 사용한다. 사용자 입력, 선택한 신호,
감정 분석 결과와 AI 응답을 분석 요청 한 건당 한 행으로 저장한다.

React는 Supabase에 직접 접근하지 않는다. Express 서버만 Supabase secret key를 환경변수로 읽고
이 테이블에 접근한다.

## 데이터 흐름

```text
React
  ↓ HTTP
Express API
  ↓ 서버 전용 Supabase secret key
public.emotion_analyses
```

## 테이블 구조

| 컬럼 | 타입 | 필수 | 용도 |
|---|---|---:|---|
| `id` | `uuid` | 예 | 분석 기록 식별자 |
| `session_id` | `uuid` | 예 | 브라우저별 기록 구분 |
| `situation_text` | `text` | 예 | 사용자가 입력한 상황, 1~500자 |
| `face_signal` | `text` | 예 | 선택한 얼굴 신호 |
| `voice_signal` | `text` | 예 | 선택한 목소리 신호 |
| `selected_scenario` | `text` | 예 | `normal`, `tension`, `tired` |
| `analysis_result` | `jsonb` | 예 | 점수, 상태 가능성, 판단 근거와 대응 방식 |
| `ai_response` | `text` | 예 | 사용자에게 표시한 AI 답변 |
| `created_at` | `timestamptz` | 예 | 저장 시각 |

## 데이터 제약 조건

- `situation_text`는 공백을 제외하고 1~500자여야 한다.
- 얼굴 신호는 `neutral`, `smile`, `tense`, `downcast`, `angry` 중 하나여야 한다.
- 목소리 신호는 `normal`, `fast`, `low`, `strong`, `bright` 중 하나여야 한다.
- 시나리오는 `normal`, `tension`, `tired` 중 하나여야 한다.
- `analysis_result`는 JSON 객체여야 한다.
- `ai_response`는 공백 문자열일 수 없다.

## 적용 방법

1. Supabase Dashboard에서 사용할 프로젝트를 연다.
2. SQL Editor로 이동한다.
3. `backend/supabase-schema.sql`의 전체 내용을 붙여 넣는다.
4. SQL을 한 번 실행한다.
5. Table Editor에서 `emotion_analyses` 테이블이 생성됐는지 확인한다.

이 SQL은 테이블이 이미 존재하면 오류를 내도록 작성했다. 기존 테이블을 자동으로 덮어쓰거나
삭제하지 않으므로 같은 파일을 반복 실행하지 않는다.

## RLS와 키 관리

- `public.emotion_analyses`에는 RLS가 활성화된다.
- `anon`, `authenticated` 역할에는 테이블 권한을 부여하지 않는다.
- `service_role` 역할에만 `select`, `insert` 권한을 부여한다.
- Supabase secret key 또는 service-role key는 React 코드에 넣지 않는다.
- 키는 루트 `.env`에만 저장한다.
- `.env`는 현재 `.gitignore`에 포함되어 있다.

로그인 기능을 추가할 때는 `session_id`를 Supabase Auth의 사용자 ID 기반 구조로 교체하고 사용자별
RLS 정책을 별도로 설계해야 한다.

## 생성 확인 SQL

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'emotion_analyses';
```

## 저장 데이터 조회 예시

```sql
select
  id,
  session_id,
  situation_text,
  face_signal,
  voice_signal,
  selected_scenario,
  analysis_result,
  ai_response,
  created_at
from public.emotion_analyses
order by created_at desc
limit 20;
```

## Server environment variables and connection check

1. Copy the root `.env.example` file to `.env`.
2. Set `SUPABASE_URL` to the Supabase project URL.
3. Set `SUPABASE_SECRET_KEY` to the server-only secret key.
4. Run `npm run test:supabase`.

If an existing project only provides a JWT service-role key, set it as
`SUPABASE_SERVICE_ROLE_KEY` in `.env`. Both key types are server-only. Never commit them to Git or
store them in an environment variable with the `VITE_` prefix.

This stage provides the server-only Supabase client and the create/list repository. The Express API
routes and React API integration will be implemented in later tasks.
