# 배포 및 검증 체크리스트

이 프로젝트는 Vercel 정적 프런트엔드, Render Express 백엔드, Supabase
데이터베이스로 배포한다. 실제 생성형 AI API는 연결하지 않는다.

## 1. Supabase

1. 새 Supabase 프로젝트에서 `backend/supabase-schema.sql`을 적용한다.
2. `backend/migrations`의 SQL을 파일명 순서대로 적용한다.
3. `guest_sessions`, `conversation_messages`, `emotion_analyses` 테이블의
   RLS가 활성화됐는지 확인한다.
4. 브라우저에는 service role 키를 절대 제공하지 않는다.

완료 기준:

- 서비스 역할을 사용하는 Express만 테이블을 읽고 쓸 수 있다.
- 원문 게스트 복구 키가 DB에 저장되지 않는다.
- 서로 다른 `guest_session_id`의 기록이 섞이지 않는다.

## 2. Render

1. 저장소 루트의 `render.yaml`로 Blueprint를 생성한다.
2. Render 대시보드에서 다음 값을 입력한다.
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `CLIENT_URL`: 실제 Vercel 프로덕션 origin
3. `GUEST_KEY_PEPPER`는 Blueprint의 `generateValue: true`로 생성한다.
4. 배포 후 `/health`가 `200`과 `{"status":"ok"}`를 반환하는지 확인한다.
5. 실제로 발급된 `onrender.com` 주소를 기록한다.

완료 기준:

- 웹 서비스는 하나뿐이며 worker, cron, 폴링 작업이 없다.
- `/health`가 준비되지 않은 설정에서 `503`을 반환한다.
- 서버 로그에 복구 키, Supabase 키 또는 요청 본문이 출력되지 않는다.

## 3. Vercel

1. 실제 Render 주소가
   `https://relationship-ai-api.onrender.com`인지 확인한다.
2. 주소가 다르면 `vercel.json`의 첫 번째 rewrite `destination`만 실제
   Render 주소로 변경하고 테스트·빌드·커밋한다.
3. Vercel 프로젝트를 배포한다.
4. 루트 페이지와 임의의 SPA 경로가 모두 앱을 표시하는지 확인한다.
5. `/api/guest-sessions`가 Vercel Function 없이 Render로 전달되는지
   확인한다.

완료 기준:

- 브라우저 주소에는 Vercel origin만 보인다.
- API 응답은 `Cache-Control: no-store`다.
- 익명 모드에서는 네트워크 API 요청이 발생하지 않는다.

## 4. 프로덕션 사용자 흐름

1. 익명 모드로 메시지를 작성하고 새로고침해 현재 탭에서 복원되는지
   확인한다.
2. 탭을 닫고 다시 열었을 때 익명 기록이 남지 않는지 확인한다.
3. 새 게스트 키를 만들고 키를 별도로 보관한다.
4. 게스트 기록을 만든 뒤 게스트에서 나간다.
5. 다른 탭에서 키를 입력해 해당 기록만 복원되는지 확인한다.
6. 잘못된 키로 다른 게스트 기록이나 키 존재 여부를 알 수 없는지
   확인한다.

## 현재 확인된 범위

- `npm run build`: 통과
- 전체 Vitest: 통과
- 로컬 프로덕션 프리뷰 루트: HTTP 200
- 로컬 SPA fallback: HTTP 200
- 로컬 빌드 JavaScript 자산: HTTP 200
- 실제 Supabase, Render, Vercel 프로덕션 왕복: 미실행
- 인앱 브라우저 시각 검증: 브라우저 연결 부재로 미실행
