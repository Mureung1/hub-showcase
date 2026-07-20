# 운영 배포

아맞다 웹과 Express API는 하나의 Vercel 프로젝트 `ppre1udes-projects/hub`에서 같은 HTTPS 출처로 배포한다.

## 주소와 배포 흐름

- 안정 주소: `https://hub-ppre1ude-ppre1udes-projects.vercel.app`
- 상태 확인: `GET /api/health`
- Pull Request: Vercel 미리보기 배포
- `main` 병합: Vercel 운영 배포
- 웹 빌드: `npm run build:web`
- API 진입점: `api/[...path].ts`

`vercel.json`의 SPA 폴백은 `/api/*`를 제외한다. API 경로는 Express 함수가 처리하고 나머지 브라우저 경로만 `index.html`로 보낸다.

## Vercel 환경 변수

다음 공개 설정은 Development, Preview, Production에 둔다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

GitHub Packages의 `@wanteddev/*`를 설치하기 위한 npm 설정 전체는 Preview와 Production의 Sensitive 환경 변수 `NPM_RC`로 둔다. 이 값에는 공식 npm 레지스트리, `@wanteddev` 레지스트리와 GitHub Packages 읽기 전용 토큰이 포함되며 저장소, 웹 번들, 로그에는 기록하지 않는다. service role key, Google OAuth secret, Supabase access token도 Vercel이나 저장소의 `VITE_*` 변수에 넣지 않는다.

웹 빌드는 시작 전에 Supabase URL과 공개 키 형식을 검증하고, 빌드 뒤에는 `scripts/verify_client_bundle.ts`가 secret key와 service-role JWT가 산출물에 없는지 다시 검사한다. 안전하지 않은 `VITE_*` 값은 배포 산출물을 만들기 전에 실패한다.

## Supabase 배포 연동

Supabase 프로젝트의 Project Settings > Integrations에서 다음 값을 유지한다.

- GitHub 저장소: `ppre1ude/hub`
- Working directory: `.`
- Deploy to production: 활성화
- Production branch name: `main`
- Automatic branching: Free 플랜에서는 비활성화

`main`에 병합하면 `supabase/migrations/`의 새 마이그레이션이 운영 데이터베이스에 적용된다. Auth 설정은 GitHub 연동의 마이그레이션 대상이 아니므로 Supabase Dashboard에서 별도로 관리한다.

## 인증 URL

- Site URL: `https://hub-ppre1ude-ppre1udes-projects.vercel.app`
- 운영 Redirect URL: `https://hub-ppre1ude-ppre1udes-projects.vercel.app/**`
- 미리보기 Redirect URL: `https://*-ppre1udes-projects.vercel.app/**`
- 로컬 Redirect URL: `http://localhost:5173/**`
- Chrome 확장 Redirect URL: `https://plajiifgmookjagiandpdagekoaimkgk.chromiumapp.org/auth`
- Google OAuth Callback URL: `https://hbztpfdzwyqwcmuwcezk.supabase.co/auth/v1/callback`

## Chrome 확장 운영 빌드

셸 또는 CI의 환경 변수가 `.env.local`보다 우선한다. 공개 Supabase 설정을 `.env.local`에 둔 상태에서 운영 API 주소를 주입해 ZIP을 만든다.

```powershell
$env:VITE_EXTENSION_API_ORIGIN='https://hub-ppre1ude-ppre1udes-projects.vercel.app'
npm run package:extension
```

결과는 `release/amadda-chrome-extension.zip`이다. 빌드된 `manifest.json`의 `host_permissions`에는 안정 주소와 Supabase 프로젝트 주소만 포함되어야 한다.

## 2026-07-20 검증 기록

- Vercel 운영 배포: `https://hub-ms4s5qwx5-ppre1udes-projects.vercel.app` (`dpl_EqxmoCVMyFNSHkvw6MPXb9a8r2FC`)
- Vercel 미리보기: `https://hub-mayu38j04-ppre1udes-projects.vercel.app`
- 안정 주소: 운영 배포를 가리키는 `https://hub-ppre1ude-ppre1udes-projects.vercel.app`
- Vercel 원격 빌드: Preview와 Production 성공, TypeScript 함수 오류 없음
- Vercel Authentication: 공개 웹과 확장 API 접근을 위해 비활성화
- 웹 첫 화면: 인증 정보가 없는 HTTPS 요청에서 HTTP 200과 `text/html` 확인
- `/api/health`: 인증 정보가 없는 HTTPS 요청에서 HTTP 200과 `{"ok":true}` 확인
- Google 로그인과 로그아웃: 안정 주소에서 정상 완료
- Supabase 마이그레이션: 로컬 3건과 운영 3건의 버전 일치
- Chrome 확장 ZIP: 안정 API 주소와 운영 Supabase 주소를 허용 호스트로 포함

## 참고 자료

- [Vercel Vite 배포](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Express 배포](https://vercel.com/docs/frameworks/backend/express)
- [Vercel 비공개 패키지](https://vercel.com/docs/builds/build-features)
- [Supabase GitHub 연동](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase Redirect URL](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)
