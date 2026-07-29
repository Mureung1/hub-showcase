# Supabase 설정

## 현재 구조

React는 Supabase에 직접 접근하지 않습니다. Express 서버만 서버 전용 키를 사용하며,
게스트 복구 키의 해시를 확인한 뒤 해당 게스트의 데이터만 처리합니다.

```text
React
  → HTTPS + X-Guest-Key
Express API
  → 서버 전용 Supabase 키
Supabase
```

현재 사용하는 테이블은 다음과 같습니다.

| 테이블 | 용도 |
| --- | --- |
| `guest_sessions` | 게스트 키의 해시, 생성·만료 시각 |
| `emotion_analyses` | 사용자 입력, 제한된 얼굴 신호 메타데이터, 분석 결과와 AI 응답 |
| `conversation_messages` | 향후 메시지 단위 저장을 위한 구조. 현재 UI 복원 경로에서는 사용하지 않음 |

`emotion_analyses.guest_session_id`가 인증된 게스트 소유권의 기준입니다.
`session_id`는 이전 브라우저 세션 구조와의 호환을 위해 남아 있으며 접근 권한 판단에
사용하지 않습니다.

## 적용 순서

새 프로젝트에서는 SQL Editor에서 다음 순서로 적용합니다.

1. `backend/supabase-schema.sql`
2. `backend/migrations/20260724_add_face_signal_metadata.sql`
3. `backend/migrations/20260724_make_camera_face_signal_optional.sql`
4. `backend/migrations/20260729_add_guest_sessions.sql`

마이그레이션은 기존 레코드를 임의로 삭제하지 않습니다. 운영 DB에 적용하기 전에는
Supabase의 백업과 이미 적용된 마이그레이션을 먼저 확인합니다.

## 주요 데이터 규칙

- `situation_text`는 1~500자입니다.
- 수동 얼굴 신호는 `neutral`, `smile`, `tense`, `downcast`, `angry` 중 하나입니다.
- 카메라 입력은 확정 감정값을 저장하지 않고 `face_signal`을 `null`로 둡니다.
- 카메라 메타데이터는 출처, 0~1의 신호 강도, 허용된 근거 최대 3개, 규칙 버전만
  저장합니다.
- 영상·사진·프레임·랜드마크 좌표·전체 blendshape·장치 정보는 저장하지 않습니다.
- 분석 결과는 JSON 객체이며 `ai_response`는 사용자에게 표시한 응답입니다.

## 권한과 비밀정보

- 세 테이블 모두 RLS를 활성화합니다.
- `anon`, `authenticated` 역할에는 테이블 권한을 주지 않습니다.
- 서버의 `service_role`만 필요한 읽기·쓰기 권한을 갖습니다.
- `SUPABASE_SECRET_KEY` 또는 호환용 `SUPABASE_SERVICE_ROLE_KEY`는 Render에만 둡니다.
- 서버 전용 키를 React 코드나 `VITE_` 환경 변수에 넣지 않습니다.
- `.env`는 Git에 커밋하지 않습니다.

루트 `.env.example`을 참고해 로컬 검증용 `.env`를 만들 수 있지만, 운영 배포에는 Render
환경 변수를 사용합니다.

## 연결 확인

```bash
npm run test:supabase
```

테이블과 RLS 상태는 SQL Editor에서도 확인할 수 있습니다.

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('guest_sessions', 'emotion_analyses', 'conversation_messages')
order by tablename;
```

게스트별 분석 기록 수를 확인할 때는 원문 키가 아닌 내부 식별자를 사용합니다.

```sql
select guest_session_id, count(*) as analysis_count
from public.emotion_analyses
where guest_session_id is not null
group by guest_session_id
order by analysis_count desc;
```

