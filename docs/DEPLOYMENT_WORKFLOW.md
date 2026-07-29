# Later 배포 및 검증 워크플로우

이 문서는 캠프 이후에도 재사용할 수 있는 Vercel(Frontend) → Render(Express) →
Supabase(Database/Storage) 배포 순서와 완료 기준을 정의한다. 실제 비밀 값과 서비스
로그는 저장소에 복사하지 않는다.

## 배포 대상과 완료 범위

이번 데모의 핵심 사용자 흐름은 **콘텐츠 저장 → 자동 제목·요약·분류 → 카테고리에서
저장 결과 조회**다.

| 배포 전 완료(P0) | 데모 이후(P1/P2) |
| --- | --- |
| URL·텍스트·이미지 저장 | 로그인과 사용자별 데이터 분리 |
| Express 입력 검증과 Supabase 저장 | 푸시 리마인더 |
| Gemini 분류 및 규칙 기반 fallback | 공유 시트·Apple 단축어 |
| 카테고리 조회·검색·아카이브 | 사용자 지정 분류 규칙 |
| health API, CORS, 배포 환경변수 | 네이티브 앱 |

## 0. 사전 품질 게이트

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Supabase SQL Editor에서 `supabase/migrations`의 migration 세 개를 파일명 순서대로
적용한다. `items` 테이블과 public `later-images` Storage bucket이 생성되었는지
확인한다.

## 1. Render에 Express 배포

1. Render에서 **New → Blueprint**를 선택하고 이 저장소를 연결한다.
2. 루트의 `render.yaml`을 사용한다. 저장소가 monorepo로 바뀌어 BE가 별도 폴더로
   이동하면 Render의 Root Directory도 그 폴더로 바꾼다.
3. Dashboard에서 아래 변수를 입력한다. `PORT`는 입력하지 않는다. Express가
   Render가 주입한 `PORT`를 사용한다.

| 변수 | 값 |
| --- | --- |
| `CLIENT_ORIGIN` | 최종 Vercel origin. 여러 개면 쉼표로 구분하고 경로·끝 `/` 제외 |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 service-role key |
| `SUPABASE_STORAGE_BUCKET` | `later-images` |
| `GEMINI_API_KEY` | Gemini API key(선택, 없으면 규칙 분류) |
| `GEMINI_MODEL` | 사용할 모델명(선택, API key와 함께 설정) |

키는 Render Dashboard에만 저장하고 GitHub/Vercel의 공개 변수나
`NEXT_PUBLIC_*`에는 넣지 않는다. 배포 뒤 다음 응답을 확인한다.

```bash
curl --fail --show-error https://<render-service>.onrender.com/health
# {"status":"ok"}
```

## 2. Vercel에 React/Next.js 배포

1. Vercel에서 저장소를 import한다.
2. Framework Preset은 Next.js, Root Directory는 이 저장소 구조에서는 `.`이다.
   FE가 별도 폴더로 이동하면 해당 폴더를 지정한다.
3. Production 환경변수 `NEXT_PUBLIC_API_BASE_URL`에 Render origin을 넣는다.
   끝 `/`와 `/api`는 넣지 않는다.
4. Production deploy를 실행한다.
5. 확정된 Vercel origin을 Render의 `CLIENT_ORIGIN`에 반영하고 Render를 재배포한다.

Preview 배포에서도 API를 호출해야 한다면 Preview URL을 `CLIENT_ORIGIN`에 추가한다.
무제한 wildcard CORS는 사용하지 않는다.

## 3. 배포 환경 E2E 확인

아래 순서가 모두 통과해야 배포 완료로 표시한다.

1. 시크릿/로그아웃 브라우저에서 Vercel URL을 열고 홈 화면이 보이는지 확인한다.
2. Render `/health`가 `200`과 `{"status":"ok"}`를 반환하는지 확인한다.
3. 홈에 `React Express Supabase 배포 검증`을 입력해 저장한다.
4. 성공 안내의 **분류 결과 확인하기**를 누른다.
5. 카테고리 화면에서 방금 저장한 제목·요약·카테고리를 확인한다.
6. Supabase Table Editor의 `items` 최신 행에서 같은 `content`와 `created_at`을
   확인한다. 이미지 테스트라면 Storage bucket의 새 object와 `image_url`도 확인한다.
7. 항목을 아카이브한 뒤 아카이브 화면에서 보이고, 복원 후 카테고리에 다시 보이는지
   확인한다.

검증 증거에는 비밀 값 대신 확인 시각(KST), FE/BE 공개 URL, HTTP status, DB 행의
`id`만 기록한다.

## 4. 실패 로그와 해결 기록

| 시각(KST) | 단계/증상 | 확인한 로그 | 원인 | 수정 | 재검증 |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD HH:mm | 예: 저장 시 CORS 오류 | Render request log | `CLIENT_ORIGIN` 끝 `/` 포함 | origin 수정 후 재배포 | POST 201 |

자주 발생하는 원인:

- `Failed to fetch`/CORS: Vercel origin과 Render `CLIENT_ORIGIN`의 scheme, hostname,
  끝 `/`를 비교한다.
- health는 성공하지만 저장이 `500`: Render의 Supabase URL/service-role key와
  migration 적용 여부를 확인한다.
- 이미지 저장만 실패: `SUPABASE_STORAGE_BUCKET`, bucket, Storage 정책과 MIME/5MB
  제한을 확인한다.
- FE가 옛 BE를 호출: Vercel Production 변수의 scope와 재배포 시점을 확인한다.
- Render가 시작되지 않음: build/start log, Node 버전, `npm ci`,
  `npm run start:server`, 주입된 `PORT` 사용을 확인한다.

## 5. 배포 완료 후 제출

- `showcase/showcase.json`의 `demoUrl`을 실제 Vercel URL로 바꾼다.
- 5분 미만 영상을 업로드한 뒤 `demoVideoUrl`에 누구나 확인 가능한 HTTPS URL을
  추가한다. 아직 없는 URL이나 예시 URL은 넣지 않는다.
- 썸네일과 스크린샷 파일이 실제로 존재하는지 확인한다.
- URL을 시크릿 창에서 다시 열고 PR에 검증 결과와 migration/환경변수 이름을 적는다.

## 롤백

Frontend는 Vercel의 직전 정상 Deployment를 Promote하고, Backend는 Render에서 직전
정상 commit을 Manual Deploy한다. DB migration은 데이터 손실 가능성이 있으므로 자동
rollback하지 않고, Supabase backup과 영향 쿼리를 확인한 뒤 별도 migration으로
복구한다.

## 현재 배포 기록

2026-07-29 21:15 KST 기준:

| 확인 항목 | 결과 |
| --- | --- |
| Vercel production | `https://later-theta-fawn.vercel.app` 배포 성공 |
| 외부 홈 | HTTP `200` |
| 외부 health | `/api/health` → `{"status":"ok"}` |
| 화면–API–DB 경로 | 테스트 항목 POST `201`, 반환/재조회된 Supabase item `id=22` |
| Render Express | `render.yaml` 준비 완료, Render 계정 연결과 환경변수 입력 대기 |
| 영상 | 업로드 및 공개 권한 확인 후 `demoVideoUrl` 추가 필요 |

현재 production은 기존 Vercel serverless Express 경로도 함께 포함하므로 외부 E2E는
동작한다. 그러나 과제의 최종 분리 구조인 **Vercel Frontend → Render Express** 완료로
판정하려면 Render 서비스를 생성하고 `NEXT_PUBLIC_API_BASE_URL` 및 `CLIENT_ORIGIN`을
서로 연결한 뒤 3절의 E2E를 다시 실행해야 한다.
