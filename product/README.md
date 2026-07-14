# LocalTwin Product

이 폴더는 실제 서비스 source와 제품 배포 설정의 경계다. 루트 `docs/`, `.harness/`와
legacy prototype은 제품 build에 포함하지 않는다.

## Local development

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

API 환경변수는 `product/.env.example`을 기준으로 `product/.env`에 두고, 웹의 문서 URL은
`product/apps/web/.env.example`의 `VITE_DOCS_URL`로 설정한다. 저장소 루트의 기존 `.env`는
이동 과정에서 수정하거나 공개하지 않는다.

## Verification

```powershell
pnpm check
node ../scripts/build_docs_site.mjs
python ../scripts/check_deploy_artifacts.py
```

## Deployment

- 제품 Vercel 프로젝트: Root Directory `product`
- 문서 Vercel 프로젝트: 저장소 root의 `vercel.json`
- 제품 output: `product/apps/web/dist`
- 문서 output: `dist/docs-site`

공개 제품 URL 생성과 API hosting 연결은 후속 배포·검색 통합 Task에서 수행한다.
