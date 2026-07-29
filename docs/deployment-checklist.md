# 배포 및 검증 체크리스트

## 현재 구성

```text
Vercel: https://hub-five-topaz.vercel.app
  └─ /api rewrite
Render: https://relationship-ai-api.onrender.com
  ├─ Supabase
  └─ Gemini Developer API
```

## Supabase

1. `backend/supabase-schema.sql`을 적용합니다.
2. `backend/migrations` SQL을 파일명 순서대로 한 번씩 적용합니다.
3. `guest_sessions`, `conversation_messages`, `emotion_analyses`의 RLS를
   확인합니다.
4. `anon`, `authenticated` 역할이 직접 읽고 쓸 수 없는지 확인합니다.

완료 기준:

- 원문 복구 키가 DB에 없음
- `emotion_analyses.guest_session_id`로 게스트 기록 격리
- 만료 게스트 삭제 시 연결 기록도 cascade 삭제
- 영상·프레임·랜드마크 데이터 없음

## Render Free

Render 웹 서비스 `relationship-ai-api`에 다음 값을 설정합니다.

```text
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
GUEST_KEY_PEPPER=32자 이상의 무작위 비밀값
CLIENT_URL=https://hub-five-topaz.vercel.app
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-lite
AI_RATE_LIMIT_MAX=10
```

Blueprint가 결제를 요구하는 환경이라면 기존 무료 Web Service의 Environment에서
직접 설정합니다. 비밀값은 소스, Vercel과 `VITE_` 변수에 넣지 않습니다.

완료 기준:

- `GET /health`가 HTTP 200
- `trust proxy=1`로 Render의 전달 주소 처리
- worker, cron, keep-alive와 폴링 없음
- 로그에 키와 요청 본문 없음

## Vercel

`vercel.json`의 API rewrite가 SPA fallback보다 앞에 있어야 합니다.

```json
{
  "source": "/api/:path*",
  "destination": "https://relationship-ai-api.onrender.com/api/:path*"
}
```

배포:

```bash
npx vercel deploy --prod --yes
```

완료 기준:

- 프로덕션 별칭이 최신 JS/CSS hash를 반환
- 루트와 SPA 경로가 `index.html` 표시
- `/api/ai-chat/responses`가 Render 라우트로 전달
- `/api` 응답에 `Cache-Control: no-store`

## 프로덕션 사용자 흐름

1. 익명으로 시작하고 메시지를 저장합니다.
2. 같은 탭 새로고침에서 복원되는지 확인합니다.
3. 새 탭에서는 이전 익명 기록이 없는지 확인합니다.
4. 게스트 키를 생성하고 한 번 표시되는 키를 복사합니다.
5. 게스트 기록을 만든 뒤 `게스트에서 나가기`를 누릅니다.
6. 다른 탭에서 키를 복구해 해당 기록만 확인합니다.
7. 카메라 시작·중지와 화면 이동 시 카메라 종료를 확인합니다.
8. 감정 신호 화면의 지구본 자동 회전과 드래그를 확인합니다.
9. 두 번째·세 번째 화면의 `처음으로`를 확인합니다.

## 2026-07-29 자동 확인

- 전체 Vitest 38개 파일, 112개 테스트 통과
- 프로덕션 빌드 통과
- Vercel 프로덕션 HTTP 200
- Render `/health` HTTP 200
- Vercel 프록시의 AI 채팅 라우트가 인증 오류 `401`을 반환해 최신 라우트 확인

실제 Gemini 생성 성공 여부는 API 키·무료 할당량을 소비하므로 이 점검에서는
호출하지 않았습니다. 실제 카메라 권한과 화면 시각 비교도 브라우저에서 별도로
확인합니다.

