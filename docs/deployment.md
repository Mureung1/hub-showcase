# 운영 배포

아맞다 웹과 Express API는 하나의 Vercel 프로젝트 `ppre1udes-projects/hub`에서 같은 HTTPS 출처로 배포한다.

## 주소와 배포 흐름

- 안정 주소: `https://hub-ppre1udes-projects.vercel.app`
- 상태 확인: `GET /api/health`
- Pull Request: Vercel 미리보기 배포
- `main` 병합: Vercel 운영 배포
- 웹 빌드: `npm run build:web`
- 상태 확인 진입점: `api/health.ts`
- 캡처 진입점: `api/insights/capture.ts`
- 메모 진입점: `api/insights/[insightId]/memo.ts`
- 꺼내보기 진입점: `api/insights/retrieve.ts`
- Notion OAuth callback: `api/imports/notion/callback.ts`
- Notion 연결·분석: `api/imports/notion/`
- 가져오기 만료 정리: `api/cron/import-cleanup.ts`

`vercel.json`의 SPA 폴백은 `/api/*`를 제외한다. API 경로는 Express 함수가 처리하고 나머지 브라우저 경로만 `index.html`로 보낸다.

Vercel의 직접 Function 배치는 파일 경로를 공개 URL에 대응시키므로 각 운영 API를 실제 경로와 같은 디렉터리에 둔다. 한 단계 동적 파일 하나에 여러 경로 깊이를 위임하지 않는다.

## Vercel 환경 변수

다음 공개 설정은 Development, Preview, Production에 둔다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

다음 값은 Preview와 Production의 Sensitive 환경 변수로 둔다. Vercel은 Development 환경의 Sensitive 변수를 지원하지 않으므로 로컬 개발에서는 `.env.local`만 사용한다. 실제 값은 저장소·문서·빌드 출력에 기록하지 않는다.

```text
IMPORT_APP_ORIGIN
IMPORT_TOKEN_ENCRYPTION_KEY
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_REDIRECT_URI
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

`IMPORT_TOKEN_ENCRYPTION_KEY`는 base64로 표현한 32바이트 키다. `IMPORT_APP_ORIGIN`은 각 환경의 고정 HTTPS origin이고 `NOTION_REDIRECT_URI`는 같은 환경의 `${안정주소}/api/imports/notion/callback`과 정확히 일치해야 한다. 위 값에 `VITE_` 접두사를 붙이지 않는다.

GitHub Packages의 `@wanteddev/*`를 설치하기 위한 npm 설정 전체는 Preview와 Production의 Sensitive 환경 변수 `NPM_RC`로 둔다. 이 값에는 공식 npm 레지스트리, `@wanteddev` 레지스트리와 GitHub Packages 읽기 전용 토큰이 포함되며 저장소, 웹 번들, 로그에는 기록하지 않는다. service role key, Google OAuth secret, Supabase access token도 Vercel이나 저장소의 `VITE_*` 변수에 넣지 않는다.

웹 빌드는 시작 전에 Supabase URL과 공개 키 형식을 검증하고, 빌드 뒤에는 `scripts/verify_client_bundle.ts`가 secret key와 service-role JWT가 산출물에 없는지 다시 검사한다. 안전하지 않은 `VITE_*` 값은 배포 산출물을 만들기 전에 실패한다.

## Notion Public Connection

Notion Creator Dashboard의 Build > Public connections에서 다음 설정을 사용한다.

- Installation scope: `Any workspace`
- Content capabilities: `Read content`만 활성화
- `Update content`, `Insert content`, 사용자 이메일, 댓글 권한: 비활성화
- Redirect URI: 배포 환경의 `NOTION_REDIRECT_URI` 한 건을 정확히 등록
- Preview 검증 전 해당 Preview callback URL을 명시적으로 추가하고, 검증 뒤 불필요한 URI는 제거

사용자는 Notion 공식 page picker에서 공유할 페이지를 직접 선택한다. Marketplace listing은 Public Connection의 OAuth 사용과 별도이며 이번 출시 조건이 아니다. 설정 근거는 [Notion Public connections](https://developers.notion.com/guides/get-started/public-connections), [Connection capabilities](https://developers.notion.com/reference/capabilities), [Marketplace listing](https://developers.notion.com/guides/get-started/marketplace-listing)을 따른다.

## 가져오기 API 제한과 만료 정리

Vercel Firewall에는 `/api/imports/`의 `start`, `analyze`, `cancel`, `complete` 요청을 IP·리전당 60초 30회로 제한하는 규칙을 둔다. OAuth callback은 단일 사용 state 검증, `/api/cron/import-cleanup`은 `CRON_SECRET` Bearer 검증을 사용하므로 이 사용자 요청 제한에서 제외한다.

`vercel.json`은 `/api/cron/import-cleanup`을 `10 18 * * *`로 매일 호출한다. Vercel은 `CRON_SECRET`을 `Authorization: Bearer ...` 헤더로 자동 전달하며 서버는 timing-safe 비교 뒤에만 정리를 실행한다. Hobby plan에서는 지정 시각부터 같은 한 시간 안에 실행될 수 있으므로 정확한 분 단위 삭제를 약속하지 않는다. 만료 여부는 Cron 실행 시각이 아니라 DB의 `expires_at` timestamp로 판정한다. 자세한 동작은 [Vercel Cron 관리](https://vercel.com/docs/cron-jobs/manage-cron-jobs)와 [요금제별 정밀도](https://vercel.com/docs/cron-jobs/usage-and-pricing)를 따른다.

연결 생성 24시간 뒤 삭제 대상이 되는 것은 암호화한 Notion access·refresh token과 nonce·인증 tag, 연결 row의 workspace·state 정보, 미완료 작업(`analyzing`, `ready`, `failed`)의 Provider cursor·후보·오류·컬렉션이다. 이 값들은 24시간이 되는 즉시 삭제되는 것이 아니라 다음 일일 Vercel Cron에서 삭제되므로, 현재 일정과 Hobby plan 정밀도에서는 만료 후 최대 약 25시간이 더 걸릴 수 있다.

가져오기를 완료하면 URL·제목·메모 후보와 출처 위치를 포함한 전체 후보 항목은 commit 트랜잭션에서 즉시 삭제한다. 되돌리기를 위해 작업 ID, 사용자 ID, 생성된 인사이트 ID와 반영 직후 수정 시각만 24시간 동안 별도로 저장한다. Supabase Cron은 이 ID와 시각을 1분마다 확인해 만료된 행을 삭제하므로 물리 삭제는 만료 뒤 다음 실행에서 이루어진다. 예약 작업이 지연되어도 Undo RPC는 DB 시각 기준 완료 후 24시간이 지난 요청을 거부한다. 생성된 인사이트와 `completed`·`undone` 요약 기록은 자동 정리 대상이 아니다.

## 공개 저장 API 요청 제한

Vercel Firewall의 `인사이트 저장 API 요청 제한` 규칙으로 Supabase 인증 전에 반복 요청을 차단한다. 이 규칙은 Vercel 프로젝트의 운영 설정이며 애플리케이션 인스턴스 메모리에 카운터를 두지 않는다.

| 항목      | 운영 값                                         |
| --------- | ----------------------------------------------- |
| 적용 경로 | Request Path가 `/api/insights/`로 시작하는 요청 |
| 기준 단위 | 요청 IP와 Vercel 리전                           |
| 알고리즘  | Fixed window                                    |
| 허용량    | IP·리전당 60초에 30회                           |
| 초과 응답 | HTTP 429                                        |
| 복구      | 다음 60초 시간 창에서 자동 허용                 |

한 번의 일반 저장은 캡처 1회와 선택적 메모 1회까지 사용하므로 같은 IP와 리전에서 30회는 1분에 저장·메모 15세트를 처리할 수 있는 여유다. Vercel WAF 카운터는 리전별로 집계되므로 여러 리전에 걸친 요청의 합계는 이 값을 넘을 수 있다. `/api/health`는 적용 경로 밖이므로 제한 상태에서도 상태 확인을 유지한다.

Vercel Firewall 규칙은 코드 배포와 별도로 관리한다. CLI로 규칙을 추가·수정·삭제하면 초안으로 저장되며, 차이를 확인하고 게시해야 운영 트래픽에 반영된다. 값을 바꿀 때는 다음 순서로 실행하고 이 문서와 #57을 함께 갱신한다.

```powershell
vercel firewall diff --no-color
vercel firewall publish --yes
vercel firewall rules list --no-color
```

## Supabase 배포 연동

Supabase 프로젝트의 Project Settings > Integrations에서 다음 값을 유지한다.

- GitHub 저장소: `ppre1ude/hub`
- Working directory: `.`
- Deploy to production: 활성화
- Production branch name: `main`
- Automatic branching: Free 플랜에서는 비활성화

`main`에 병합하면 `supabase/migrations/`의 새 마이그레이션이 운영 데이터베이스에 적용된다. Auth 설정은 GitHub 연동의 마이그레이션 대상이 아니므로 Supabase Dashboard에서 별도로 관리한다.

## Supabase Pull Request 검사

`.github/workflows/supabase-migration-check.yml`의 `Supabase migration validation` 검사는 `main` 대상 Pull Request마다 실행된다. 이 검사는 브랜치 보호의 필수 상태 검사이므로 workflow 수준의 `paths` 필터를 사용하지 않는다. 대신 변경 파일을 먼저 확인하고 다음 경로가 바뀐 경우에만 Docker 기반 데이터베이스 검증을 실행한다.

- `supabase/**`
- `.github/workflows/supabase-migration-check.yml`

관련 변경이 없으면 저장소 checkout과 변경 파일 확인만 수행하고 성공한다. 관련 변경이 있으면 고정된 Supabase CLI `2.109.1`로 빈 로컬 데이터베이스를 시작해 versioned migration을 순서대로 적용한 뒤 `supabase test db`로 RLS 데이터베이스 테스트 전체를 실행한다.

GitHub-hosted runner는 매 실행이 깨끗해야 하므로 데이터베이스 상태나 Docker layer를 별도로 캐시하지 않는다. 비용과 대기 시간은 관련 없는 Pull Request의 무거운 단계를 생략하고, 같은 Pull Request의 이전 실행을 취소하는 방식으로 제한한다. Job timeout은 15분이다. 2026-07-20 Windows의 Docker image 최초 다운로드를 포함한 로컬 실측은 migration 적용 108.5초, 33개 테스트 4.3초, 합계 112.8초였으며, GitHub Actions 최초 실행은 2분 33초였다.

전용 clone이나 폐기 가능한 로컬 Supabase 환경에서 CI와 같은 검사를 재현한다. `stop --no-backup`은 해당 로컬 프로젝트의 데이터를 삭제하므로 보존할 데이터가 있는 작업 환경에서는 실행하지 않는다.

```powershell
npx --yes supabase@2.109.1 stop --no-backup
npx --yes supabase@2.109.1 db start
npx --yes supabase@2.109.1 test db
npx --yes supabase@2.109.1 stop --no-backup
```

실패한 migration 파일과 SQL 오류, pgTAP 테스트명은 Actions 로그에 그대로 출력된다. 실패한 단계만 확인할 때는 run ID를 사용한다.

```powershell
gh run view <run-id> --log-failed
```

## 꺼내보기 의미 검색 배포

의미 검색은 데이터베이스 구조, 서버 환경 변수, 앱 배포와 기존 데이터 변환이 모두 준비되어야 사용할 수 있다. 다음 순서를 지킨다.

1. `supabase/migrations/20260729010000_add_semantic_retrieve.sql`을 적용한다.
2. Vercel 서버 환경에 `GEMINI_API_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`가 있는지 확인한다.
3. 앱을 배포하고 인증되지 않은 `/api/insights/retrieve` 요청이 HTTP 401을 반환하는지 확인한다.
4. `npm run retrieve:backfill:submit -- --dry-run`으로 기존 인사이트 변환 대상 건수만 확인한다.
5. 담당자가 건수와 비용을 승인한 뒤 `--confirm`으로 Gemini Batch 작업을 제출한다.
6. 제출 때 출력된 배치 이름으로 `npm run retrieve:backfill:apply -- --batch batches/배치-ID --dry-run`을 실행해 상태와 성공·실패 건수를 확인한다.
7. 완료 결과 반영을 다시 승인한 뒤 같은 명령에 `--confirm`을 붙인다.
8. 기존 데이터 변환 대상이 0건인지 확인하고, 표현이 다른 대표 상황으로 꺼내보기를 확인한다.

Batch 제출과 결과 반영은 자동 배포에 넣지 않는다. 두 명령의 `--confirm`은 서로 다른 승인 단계이며, 실제 API 키와 제목·메모는 출력하거나 작업 기록에 남기지 않는다. 제출 결과를 연결하는 로컬 상태 파일은 `scripts/retrieve_backfill/state/`에 있으므로 결과 반영도 같은 환경에서 실행한다.

Gemini Embedding 2의 Batch API는 Free Tier에서 제공되지 않는다. `GEMINI_API_KEY`가 연결된 프로젝트를 Paid Tier로 전환하고, Prepay 계정이라면 사용 가능한 잔액이 있는지 확인한 뒤에만 Batch를 제출한다.

문제가 생기면 보관함 조회·저장과 보관함 검색을 유지하고 꺼내보기 API만 비활성화한다. 의미 검색 실패를 보관함 단어 검색으로 자동 전환하지 않는다. 벡터와 변환 작업 테이블은 원본 인사이트와 분리되어 있으므로 복구 과정에서 인사이트를 삭제하지 않는다.

## 인증 URL

- Site URL: `https://hub-ppre1udes-projects.vercel.app`
- 운영 Redirect URL: `https://hub-ppre1udes-projects.vercel.app/**`
- 미리보기 Redirect URL: `https://*-ppre1udes-projects.vercel.app/**`
- 로컬 Redirect URL: `http://localhost:5173/**`
- Chrome 확장 Redirect URL: `https://plajiifgmookjagiandpdagekoaimkgk.chromiumapp.org/auth`
- Google OAuth Callback URL: `https://hbztpfdzwyqwcmuwcezk.supabase.co/auth/v1/callback`

## Notion 가져오기 Preview 검증

승인된 테스트 계정과 Preview callback을 등록한 뒤 다음을 수동 확인한다.

1. 390px 빈 보관함에서 `링크 저장`과 `내 저장물 가져오기`가 함께 보인다.
2. URL 붙여넣기 분석 전에는 `insights`가 바뀌지 않는다.
3. Chrome bookmark HTML, CSV, JSON, Markdown, ZIP의 집계와 모음 경로가 맞다.
4. Network 요청의 `/api`와 Supabase body에 원본 파일이 없다.
5. 기존 URL의 제목·메모·카테고리는 commit 뒤에도 유지된다.
6. Notion에서 선택한 두 page와 한 data source 하위 링크만 후보가 된다.
7. 권한 거부, 브라우저 닫기, 429, 네트워크 단절 뒤 입력과 보관함을 유지한 복구 안내가 나온다.
8. 완료·취소 뒤 암호화 token 열이 null이고 revoke endpoint가 호출된다.
9. 완료 직후 원본 후보 항목은 사라지고 요약, 생성 인사이트 ID와 반영 시각만 남는다.
10. 24시간 안에 가져온 인사이트 하나를 수정한 뒤 Undo하면 수정 항목은 남고 나머지만 삭제된다.
11. 24시간이 지나면 Undo action 대신 만료 안내가 표시되고, 기록 삭제 뒤에도 인사이트는 남는다.
12. 긴 제목·20단계 경로가 1280px, 768px, 390px에서 가로 overflow 없이 표시되고 키보드만으로 전체 흐름을 완료할 수 있다.
13. Android 시스템 브라우저 승인 뒤 `com.ppre1ude.amadda://import/notion`으로 돌아와 분석을 이어간다.

배포 권한이 있는 담당자는 Sensitive 변수의 로그·build output 비노출, Firewall 게시 상태, Notion 관련 migration 적용 순서, Cron Jobs 활성화, 안정 주소의 token 교환·분석·revoke 성공을 함께 확인한다.

## Chrome 확장 운영 빌드

셸 또는 CI의 환경 변수가 `.env.local`보다 우선한다. 공개 Supabase 설정을 `.env.local`에 둔 상태에서 운영 API 주소를 주입해 ZIP을 만든다.

```powershell
$env:VITE_EXTENSION_API_ORIGIN='https://hub-ppre1udes-projects.vercel.app'
npm run package:extension
```

결과는 `release/amadda-chrome-extension.zip`이다. 빌드된 `manifest.json`의 `host_permissions`에는 안정 주소와 Supabase 프로젝트 주소만 포함되어야 한다.

## 2026-07-20 검증 기록

- Vercel 운영 배포: `https://hub-ms4s5qwx5-ppre1udes-projects.vercel.app` (`dpl_EqxmoCVMyFNSHkvw6MPXb9a8r2FC`)
- Vercel 미리보기: `https://hub-mayu38j04-ppre1udes-projects.vercel.app`
- 안정 주소: 운영 배포를 가리키는 `https://hub-ppre1udes-projects.vercel.app`
- Vercel 원격 빌드: Preview와 Production 성공, TypeScript 함수 오류 없음
- Vercel Authentication: 공개 웹과 확장 API 접근을 위해 비활성화
- 웹 첫 화면: 인증 정보가 없는 HTTPS 요청에서 HTTP 200과 `text/html` 확인
- `/api/health`: 인증 정보가 없는 HTTPS 요청에서 HTTP 200과 `{"ok":true}` 확인
- Google 로그인과 로그아웃: 안정 주소에서 정상 완료
- Supabase 마이그레이션: 로컬 3건과 운영 3건의 버전 일치
- Chrome 확장 ZIP: 안정 API 주소와 운영 Supabase 주소를 허용 호스트로 포함

## 2026-07-20 요청 제한과 API 경로 검증 기록

- Vercel Firewall 운영 규칙: `인사이트 저장 API 요청 제한` (`rule_api_wJ3BaT`)
- 요청 제한: 같은 IP·리전에서 30회까지 원점 요청 허용, 31번째 HTTP 429
- 경로 공유: 캡처 제한 초과 상태에서 메모 요청도 HTTP 429
- 제외 경로: 제한 상태에서 `/api/health` HTTP 200
- 복구: 제한 초과 뒤 60.7초에 새 시간 창의 원점 요청 허용
- Vercel Preview: `https://hub-3hvwxs3vi-ppre1udes-projects.vercel.app` (`dpl_6osg1rk2cTM13KYLR4Shkpn9i7x1`, Ready)
- Preview 함수: `api/health`, `api/insights/capture`, `api/insights/[insightId]/memo`
- Preview 응답: health HTTP 200, 인증 정보 없는 캡처·메모 HTTP 401
- 병합 뒤 확인: 안정 운영 주소에서 웹 저장 1회와 Chrome 확장 저장·메모 1회를 다시 실행한다.

## 참고 자료

- [Vercel Vite 배포](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Express 배포](https://vercel.com/docs/frameworks/backend/express)
- [Vercel Functions](https://vercel.com/docs/functions/runtimes)
- [Vercel WAF 요청 제한](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Vercel Cron 관리](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel Cron 사용량과 정밀도](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Firewall CLI](https://vercel.com/docs/cli/firewall)
- [Vercel 비공개 패키지](https://vercel.com/docs/builds/build-features)
- [Supabase GitHub 연동](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase GitHub Actions 자동 테스트](https://supabase.com/docs/guides/deployment/ci/testing)
- [Supabase 데이터베이스 테스트](https://supabase.com/docs/guides/database/testing)
- [Gemini Batch API](https://ai.google.dev/gemini-api/docs/batch-api)
- [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Supabase Redirect URL](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Notion Public connections](https://developers.notion.com/guides/get-started/public-connections)
- [Notion Connection capabilities](https://developers.notion.com/reference/capabilities)
- [Notion token revoke](https://developers.notion.com/reference/revoke-token)
