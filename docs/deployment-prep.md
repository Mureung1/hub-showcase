# 첫 배포 결과

## 0. 공개 주소와 무료 등급

| 서비스 | 공개 주소 | 등급 | 상태 |
| --- | --- | --- | --- |
| 환자 웹 | https://baro-jinryo-patient.vercel.app | Vercel Hobby | 배포 완료 |
| Express API | https://baro-jinryo-api.onrender.com | Render Free | 배포 완료 |
| API 생존 확인 | https://baro-jinryo-api.onrender.com/api/health/live | Render Free | `ok: true` 확인 |
| API DB 준비 확인 | https://baro-jinryo-api.onrender.com/api/health/ready | Render Free | Supabase 연결 확인 |
| Supabase | 비공개 프로젝트 대시보드 | Supabase Free | 연결 완료 |

유료 인스턴스, 유료 도메인, 유료 데이터베이스 기능은 사용하지 않습니다. Render Free
서비스는 일정 시간 요청이 없으면 잠들 수 있어 첫 요청이 느릴 수 있습니다.

## 1. 배포 대상

| 서비스 | 위치 | 배포 후보 | 빌드 명령 | 결과 또는 시작 명령 |
| --- | --- | --- | --- | --- |
| 환자 웹 | `apps/patient-web` | Vercel | `npm run build -w @baro-jinryo/shared -w @baro-jinryo/web-shared -w @baro-jinryo/patient-web` | `apps/patient-web/dist` |
| 병원 관리자 웹 | `apps/staff-web` | Vercel | `npm run build -w @baro-jinryo/shared -w @baro-jinryo/web-shared -w @baro-jinryo/staff-web` | `apps/staff-web/dist` |
| 플랫폼 관리자 웹 | `apps/platform-admin-web` | Vercel | `npm run build -w @baro-jinryo/shared -w @baro-jinryo/web-shared -w @baro-jinryo/platform-admin-web` | `apps/platform-admin-web/dist` |
| Express API | `apps/api` | Render | `npm run build -w @baro-jinryo/shared -w @baro-jinryo/api` | `npm run start -w @baro-jinryo/api` |

모노레포의 workspace 패키지를 함께 설치해야 하므로 배포 서비스는 저장소 최상위를
기준으로 설치합니다. Render에서는 production 환경에서도 TypeScript 빌드 도구가
필요하므로 `npm ci --include=dev`를 사용합니다.

## 2. 프론트엔드 환경변수

각 Vercel 프로젝트에 다음 변수를 설정합니다. 첫 배포에서는 환자 웹만 공개했습니다.

| 변수 | 용도 | 공개 여부 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Render API 주소와 `/api` 경로 | 공개 가능 |
| `VITE_PATIENT_WEB_URL` | 환자 웹으로 이동할 공개 주소 | 공개 가능 |
| `VITE_STAFF_WEB_URL` | 병원 관리자 웹으로 이동할 공개 주소 | 공개 가능 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 공개 가능 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 Supabase publishable key | 공개 가능 |
| `VITE_WAITING_POLL_INTERVAL_MS` | 대기 상태 조회 주기 | 공개 가능 |

로컬의 `VITE_API_BASE_URL=/api`는 Vite 프록시를 사용합니다. Vercel과 Render를 분리 배포하면 `https://<render-service>/api`와 같은 절대 주소로 변경해야 합니다.

각 Vercel 프로젝트에는 실제로 사용하는 화면 이동 주소만 등록합니다. 환자 웹에는
`VITE_STAFF_WEB_URL`, 병원 관리자 웹에는 `VITE_PATIENT_WEB_URL`과
`VITE_STAFF_WEB_URL`, 플랫폼 관리자 웹에는 `VITE_PATIENT_WEB_URL`을 설정합니다.

## 3. API 환경변수

Render 서비스에 다음 변수를 설정합니다.

| 변수 | 용도 | 비밀 여부 |
| --- | --- | --- |
| `NODE_ENV` | 배포 환경 구분. 배포에서는 `production` | 공개 가능 |
| `PORT` | Render가 제공하는 서버 포트 | 공개 가능 |
| `CORS_ORIGIN` | 환자·병원·플랫폼 웹 주소를 쉼표로 구분 | 공개 가능 |
| `PATIENT_WEB_ORIGIN` | 알림 상태 링크에 사용할 환자 웹 주소 | 공개 가능 |
| `STAFF_HOSPITAL_ID` | 개발용 병원 컨텍스트 | 공개하지 않음 |
| `ALLOW_DEV_STAFF_AUTH_BYPASS` | 개발 인증 우회. 배포에서는 `false` | 공개 가능 |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 공개 가능 |
| `SUPABASE_PUBLISHABLE_KEY` | JWT 검증에 사용하는 publishable key | 공개 가능 |
| `DATABASE_URL` | Supabase PostgreSQL 연결 문자열 | 비밀 |
| `DB_POOL_MAX` | DB 연결 풀 최대 크기 | 공개 가능 |
| `DB_CONNECTION_TIMEOUT_MS` | DB 연결 제한 시간 | 공개 가능 |
| `DB_IDLE_TIMEOUT_MS` | 유휴 연결 제한 시간 | 공개 가능 |
| `DB_SSL_REJECT_UNAUTHORIZED` | 외부 DB TLS 인증서 검증 | 공개 가능 |
| `BACKGROUND_JOB_INTERVAL_MS` | 도착 기한 만료 작업 주기 | 공개 가능 |

`DEVELOPMENT_PATIENT_PASSWORD`, `DEVELOPMENT_STAFF_PASSWORD`,
`DEVELOPMENT_PLATFORM_PASSWORD`, `DEVELOPMENT_GUEST_PASSWORD`는 개발 시드
전용입니다. production 환경변수에 등록하지 않습니다.

첫 배포의 Render Health Check Path에는 `/api/health/live`를 사용합니다. 배포 후
`/api/health/ready`를 직접 열어 Supabase 연결도 별도로 확인합니다.

## 4. 서비스 간 연결

1. Render API를 먼저 배포해 공개 API 주소를 확정했습니다.
2. 환자 웹의 `VITE_API_BASE_URL`에 Render API 주소를 설정했습니다.
3. Render의 `CORS_ORIGIN`과 `PATIENT_WEB_ORIGIN`에 환자 웹 주소를 등록했습니다.
4. Supabase Auth의 Site URL과 Redirect URL에 환자 웹 주소를 등록했습니다.
5. Vercel Production Branch를 `N105_신명현`으로 지정했습니다.

## 5. 현재 확인 결과

- 루트에서 전체 프론트엔드 빌드와 API 빌드가 성공합니다.
- Express API가 로컬에서 실행되고 Supabase 개발 DB에 연결됩니다.
- 환자 원격 등록부터 병원 직원의 도착 처리와 진료실 호출까지 실제 DB 흐름을 확인했습니다.
- `.env`와 `.env.*`는 Git에서 제외하고 `.env.example`만 추적합니다.
- 추적 중인 파일에서 실제 DB 비밀번호, Supabase secret key, Brevo SMTP 키를 발견하지 않았습니다.
- Vercel 환자 웹에서 로그인 후 서울이비인후과 원격 웨이팅 등록 화면까지 확인했습니다.
- 배포된 환자 웹에서 Render API 연결 상태가 `API 연결됨`으로 표시됩니다.
- Render의 live·ready 상태 확인 API가 모두 성공하고 ready 응답에서 DB 연결을 확인했습니다.

## 6. 배포 체크리스트

- [x] Vercel과 Render에서 포크 저장소가 선택되는지 확인
- [x] Render Runtime을 `Node`로 설정하고 저장소 루트를 Root Directory로 사용
- [x] Render Build Command를 `npm ci --include=dev && npm run build -w @baro-jinryo/shared -w @baro-jinryo/api`로 설정
- [x] Render Start Command를 `npm run start -w @baro-jinryo/api`로 설정
- [x] Render Health Check Path를 `/api/health/live`로 설정
- [x] Render Free API 서비스 생성 및 환경변수 등록
- [x] 환자 웹 Vercel Hobby 프로젝트 생성
- [ ] 병원 관리자 웹 Vercel 프로젝트 생성
- [ ] 플랫폼 관리자 웹 Vercel 프로젝트 생성
- [x] Supabase Auth 허용 URL 등록
- [x] 배포 주소 기준 CORS 설정
- [x] 배포 환경에서 환자 로그인과 원격 등록 진입 흐름 확인
- [ ] 배포 환경에서 로그인·원격 등록·도착·호출 흐름 재검증
- [ ] 개발 DB를 외부 데모에 사용할지 별도 데모 DB를 만들지 결정

병원 관리자 웹과 플랫폼 관리자 웹은 아직 공개하지 않았습니다. 따라서 환자 웹의
`병원 직원` 링크는 임시로 로컬 주소를 사용하며, 공개 환경에서는 정상 이동하지 않습니다.
