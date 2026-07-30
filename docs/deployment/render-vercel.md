# Render + Vercel 배포

ICU의 프로덕션 배포는 네 개의 독립 서비스로 구성한다.

| 서비스       | 호스팅 | 역할                                         |
| ------------ | ------ | -------------------------------------------- |
| ICU App      | Vercel | React 사용자 화면                            |
| ICU Preview  | Vercel | React 결과를 별도 origin의 iframe에서 렌더링 |
| ICU Core API | Render | 커리큘럼, 진도, 오답노트, Git Lab, 튜터 API  |
| ICU Judge    | Render | `/api/code/run` 전용 실행 서비스             |

Judge에는 Supabase와 Gemini 자격 증명을 설정하지 않는다. 프로세스와 배포 서비스를 분리해 코드 실행 장애가 Core API와 비밀 값에 직접 영향을 주는 범위를 줄인다. 현재 Node 실행기는 신뢰할 수 없는 다중 사용자 코드를 완전히 격리하는 컨테이너 샌드박스는 아니다.

## 1. Render

저장소 루트의 `render.yaml`로 Blueprint를 만든다. 두 서비스 모두 자동 배포를 끄며 GitHub Actions의 Deploy Hook으로 배포한다.

Core API에 설정할 값:

```text
ICU_ALLOWED_ORIGIN=https://<icu-app-domain>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<server-secret>
GEMINI_API_KEY=<server-secret>
```

Judge에 설정할 값:

```text
ICU_ALLOWED_ORIGIN=https://<icu-app-domain>
```

생성 후 각 서비스의 Deploy Hook URL을 GitHub Actions secret으로 등록한다.

```text
RENDER_CORE_DEPLOY_HOOK
RENDER_JUDGE_DEPLOY_HOOK
```

## 2. Vercel

같은 저장소로 프로젝트 두 개를 만든다. Vercel의 Git 자동 배포는 끄고 GitHub Actions만 사용한다.

ICU App 프로젝트:

```text
Build Command: npm run build:app
Output Directory: dist
VITE_ICU_API_MODE=server
VITE_CURRICULUM_RECOMMENDATION_MODE=server
VITE_API_BASE_URL=https://<icu-core-api>.onrender.com
VITE_CODE_RUNNER_BASE_URL=https://<icu-judge>.onrender.com
VITE_ICU_PREVIEW_URL=https://<icu-preview-domain>
```

ICU Preview 프로젝트:

```text
Build Command: npm run build:preview:deploy
Output Directory: dist-preview
VITE_ICU_APP_ORIGINS=https://<icu-app-domain>
```

다음 값을 GitHub Actions secret으로 등록한다.

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_APP_PROJECT_ID
VERCEL_PREVIEW_PROJECT_ID
```

## 3. 배포 확인

GitHub Actions의 `Deploy ICU`를 수동 실행하거나 `work` 브랜치에 push한다. 완료 후 다음을 확인한다.

1. Core `/api/health`가 `repositoryMode: "supabase"`를 반환한다.
2. Judge `/api/health`가 `service: "judge"`를 반환한다.
3. Core의 `/api/code/run`은 404를 반환한다.
4. Today → Workspace → 코드 실행 → Preview → Git Lab 흐름을 확인한다.
