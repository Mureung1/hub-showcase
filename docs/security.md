# Security Rules

Photo Navigation 서비스의 API, 로그인, DB, 파일 업로드 작업은 이 문서를 기준으로 구현한다.

## 1. Secrets and Environment Variables

- NAVER Maps, NAVER Login, Supabase 등 모든 API 키와 비밀값은 `.env`에만 둔다.
- `.env` 파일과 실제 키 값은 Git에 커밋하거나 PR, 문서, 스크린샷에 포함하지 않는다.
- `.env.example`에는 변수 이름만 남기고 값은 넣지 않는다.
- `NAVER_CLIENT_SECRET`, Supabase `service_role` 등 비밀 키는 Express 서버에서만 사용한다.
- React/Vite에 노출되는 `VITE_*` 변수에는 공개되어도 되는 Client ID 또는 공개 키만 사용한다.
- 클라이언트는 비밀 키가 필요한 외부 API를 직접 호출하지 않고, Express API를 통해 요청한다.

## 2. Authentication and Authorization

- 로그인 여부는 클라이언트 상태가 아니라 서버 세션 또는 검증된 토큰으로 판단한다.
- 관리자 승인, 반려, 공식 포토스팟 전환은 서버에서 `users.role = admin`을 확인한 뒤에만 처리한다.
- 요청 body의 `role`, `user_id`, `created_by`, `status`, `like_count` 값은 신뢰하거나 그대로 저장하지 않는다.
- 서버는 허용한 입력 필드만 꺼내고, 작성자 ID는 인증된 사용자 정보에서만 가져온다.
- 후보 제안은 기본값을 항상 `candidate` 또는 `pending`으로 저장한다. 사용자가 `official` 상태를 요청할 수 없다.
- 좋아요, 제안 수정, 삭제는 데이터의 소유자 또는 관리자만 가능하게 한다.

## 3. NAVER Login

- OAuth `state`를 매 로그인 요청마다 랜덤으로 만들고, 콜백에서 서버가 비교 검증한다.
- Redirect URI는 네이버 개발자센터에 등록한 정확한 URL만 사용한다.
- 로그인 성공 후 토큰을 URL, localStorage, 로그에 노출하지 않는다.
- 서비스 세션 쿠키는 운영 환경에서 `HttpOnly`, `Secure`, `SameSite` 속성을 설정한다.

## 4. Database and Supabase

- Supabase `service_role` 키는 서버 환경 변수에만 저장한다.
- Supabase RLS를 활성화하고 아래 원칙을 적용한다.
  - 공개 사용자는 공식 포토스팟과 승인된 가이드만 읽을 수 있다.
  - 로그인 사용자는 자신의 후보 제안만 생성, 수정, 삭제할 수 있다.
  - 좋아요는 로그인 사용자 본인 명의로만 생성 또는 취소할 수 있다.
  - 관리자만 후보 승인, 반려, 공식 전환을 할 수 있다.
- `guide_likes`에는 `(user_id, guide_id)` 유니크 제약을 둬 중복 좋아요를 막는다.

## 5. Photo Upload and Location Privacy

- 사진 업로드는 로그인 사용자에게만 허용한다.
- JPG, PNG, WebP 등 필요한 이미지 형식만 허용하고, 서버에서 실제 MIME 타입과 파일 크기를 검증한다.
- 사용자 파일명이나 경로를 그대로 사용하지 않고 UUID 기반 저장 경로를 만든다.
- 후보 사진은 관리자가 승인하기 전까지 공개 버킷이나 지도 목록에 노출하지 않는다.
- EXIF GPS 정보는 공개 전 제거하거나, 위치 공개 동의를 명확히 받는다.
- 사용자의 현재 위치는 촬영 지점 제안 용도 외에는 저장하거나 공개하지 않는다.

## 6. API Rules

- 모든 변경 API는 인증과 인가를 서버에서 확인한다.
- 입력값은 DTO 또는 스키마 검증으로 타입, 길이, 범위를 확인한다.
- `guide_json` 좌표는 0~1 범위인지 서버에서 검증한다.
- 좋아요, 후보 제안, 로그인 콜백은 요청 횟수 제한을 둔다.
- 오류 응답과 서버 로그에 비밀 키, 액세스 토큰, 개인정보를 남기지 않는다.

## 7. Pre-merge Checklist

- [ ] `.env`와 키 값이 커밋에 포함되지 않았는가?
- [ ] 서버가 클라이언트의 `role`, `status`, `user_id`를 신뢰하지 않는가?
- [ ] 관리자 API에 서버 측 권한 검증이 있는가?
- [ ] DB RLS가 데이터 소유자와 관리자 권한을 제한하는가?
- [ ] 업로드 이미지 형식, 크기, 저장 경로를 검증하는가?
- [ ] 권한 없는 요청이 `401` 또는 `403`이 되는 테스트가 있는가?

## 8. Maps Client ID and Pages Deployment

- Maps Web Dynamic Map의 **Client ID는 브라우저에서 지도 SDK를 불러오기 위해 공개될 수 있는 식별자**다. Client Secret이 아니다.
- Client ID는 NCP 콘솔에서 `localhost`와 `yf560.github.io`처럼 필요한 Web 서비스 URL로 제한한다.
- 로컬에서는 `apps/web/.env.local`, Pages 빌드에서는 GitHub Actions Secret `VITE_NAVER_MAPS_CLIENT_ID`만 사용한다.
- Client ID도 코드·문서·커밋에 직접 기록하지 않는다. `.env.example`에는 빈 변수명만 둔다.
- Client Secret, Supabase `service_role`, AWS 접근 키는 프론트엔드와 Vite 환경 변수에 절대 넣지 않는다.
- 배포 워크플로는 `npm run security:check`을 먼저 통과해야 빌드를 수행한다. 배포 직전 `git diff --check`와 추적 파일 검사를 한 번 더 수행한다.
