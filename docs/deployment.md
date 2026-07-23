# TeamFlow 배포 가이드

TeamFlow는 다음처럼 역할을 분리해 배포합니다.

```text
Vercel (React + Vite)
  └─ HTTPS API 요청 → Render (Node.js + Express)
                         └─ 사용자 JWT → Supabase (Auth + PostgreSQL + RLS)
```

로컬 개발은 기존과 동일합니다. 웹의 `VITE_TEAMFLOW_API_URL`을 비워 두면
Vite가 `/api`를 `http://127.0.0.1:3000`으로 프록시합니다.

## 배포 전에

배포 서비스는 로컬 파일을 읽지 않고 GitHub의 커밋을 가져갑니다. 먼저 배포할
변경을 검토하고 `N138_이주환` 브랜치에 커밋·push해야 합니다.

실제 `.env`, Supabase 키 값, `.vercel` 폴더는 커밋하지 않습니다.

배포에는 수업 조직 저장소가 아니라 개인 포크를 연결합니다.

```text
사용할 저장소: jsjh0526/hub
사용할 브랜치: N138_이주환
사용하지 않을 저장소: connect-AIAgentChallenge-26-1/hub
```

개인 포크에 push하는 것은 수업 조직 저장소에 merge하거나 PR을 생성하는
작업이 아닙니다. 수업 PR은 기존 방식대로 별도로 진행할 수 있습니다.

## 1. Render에 Express API 배포

저장소 루트의 `render.yaml`이 무료 Web Service, 실행 명령, 상태 확인 경로를
정의합니다.

1. Render에 GitHub 계정으로 로그인합니다.
2. `New > Blueprint`를 선택합니다.
3. 개인 포크 `jsjh0526/hub`와 `N138_이주환` 브랜치를 선택합니다.
4. Blueprint 파일은 저장소 루트의 `render.yaml`을 선택합니다.
5. 요청되는 환경변수에 다음 값을 입력합니다.

| 환경변수 | 값 |
| --- | --- |
| `TEAMFLOW_SUPABASE_URL` | TeamFlow Supabase Project URL |
| `TEAMFLOW_SUPABASE_PUBLISHABLE_KEY` | TeamFlow의 `sb_publishable_...` 키 |
| `TEAMFLOW_ALLOWED_ORIGINS` | 첫 배포에서는 임시로 `http://localhost:5173` |

`PORT`는 Render가 자동으로 제공하므로 직접 만들지 않습니다.

배포가 끝나면 다음을 확인하고 Render 주소를 복사합니다.

```text
https://<render-service>.onrender.com/health
```

정상이면 다음 JSON이 표시됩니다.

```json
{
  "status": "ok",
  "service": "teamflow-api"
}
```

## 2. Vercel에 React 웹 배포

1. Vercel에 GitHub 계정으로 로그인합니다.
2. `Add New > Project`에서 개인 포크 `jsjh0526/hub`를 Import합니다.
3. Root Directory를 `apps/web`으로 지정합니다.
4. Root Directory 설정의 `Include source files outside of the Root Directory`
   옵션이 켜져 있는지 확인합니다. 웹이 `packages/shared`를 사용하기 때문에
   필요합니다.
5. Framework Preset은 `Vite`를 선택합니다.
6. Build Command는 `npm run build`, Output Directory는 `dist`를 사용합니다.
7. Production Branch는 현재 배포 기준 브랜치인 `N138_이주환`으로 지정합니다.
8. 다음 환경변수를 Production에 등록합니다.

| 환경변수 | 값 |
| --- | --- |
| `VITE_TEAMFLOW_SUPABASE_URL` | TeamFlow Supabase Project URL |
| `VITE_TEAMFLOW_SUPABASE_PUBLISHABLE_KEY` | TeamFlow의 `sb_publishable_...` 키 |
| `VITE_TEAMFLOW_API_URL` | 1단계에서 복사한 `https://<render-service>.onrender.com` |

배포가 끝나면 Vercel의 Production Domain을 복사합니다.

```text
https://<vercel-project>.vercel.app
```

## 3. 두 서비스를 서로 허용

Render의 `TEAMFLOW_ALLOWED_ORIGINS`를 다음처럼 정확한 Vercel 운영 주소로
교체하고 저장합니다. 끝의 `/`는 넣지 않습니다.

```text
https://<vercel-project>.vercel.app
```

Render가 새 설정으로 재배포된 뒤 Vercel 사이트에서 `게스트로 둘러보기`를
눌러 API 연결을 먼저 확인합니다.

Vercel Preview URL은 배포마다 달라집니다. 현재 단계에서는 고정된 Production
Domain만 CORS에 허용합니다.

## 4. Supabase Google 로그인 주소 추가

TeamFlow Supabase Dashboard에서 다음을 설정합니다.

1. `Authentication > URL Configuration`으로 이동합니다.
2. Site URL을 Vercel Production Domain으로 설정합니다.
3. Redirect URLs에는 다음 두 주소를 유지·추가합니다.

```text
http://localhost:5173/auth/callback
https://<vercel-project>.vercel.app/auth/callback
```

운영 Redirect URL은 와일드카드 대신 정확한 주소를 사용합니다.

Google Cloud의 승인된 리디렉션 URI는 앱 주소가 아니라 기존 Supabase
callback을 계속 사용합니다.

```text
https://lmmeuoeuiouyowpthxwg.supabase.co/auth/v1/callback
```

## 5. 최종 확인

1. Vercel 사이트에서 게스트 데모를 엽니다.
2. Google로 로그인합니다.
3. 프로젝트를 만들고 협업자를 초대한 뒤 할 일을 생성합니다.
4. 페이지를 새로고침해 데이터가 유지되는지 확인합니다.
5. 프로젝트 초대를 보내고 다른 Google 계정에서 수락합니다.
6. Render의 `/health`와 브라우저 개발자 도구의 Network/Console 오류를 확인합니다.

Render 무료 Web Service는 15분 동안 요청이 없으면 중지될 수 있습니다. 첫
요청이 느릴 수 있지만 이후 요청은 정상 속도로 처리됩니다.
