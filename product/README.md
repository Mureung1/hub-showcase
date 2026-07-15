# LocalTwin Product

이 폴더는 실제 서비스 source와 제품 배포 설정의 경계다. 루트 `docs/`, `.harness/`와
legacy prototype은 제품 build에 포함하지 않는다.

## Local development

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

API key와 DB secret은 `product/.env.example`을 기준으로 `product/.env` 한 곳에 둔다.
`VITE_API_BASE_URL`, `VITE_DOCS_URL`처럼 브라우저에 공개되는 설정은
`product/apps/web/.env.example`을 기준으로 `product/apps/web/.env.local`에 둔다. 저장소
루트 `.env`는 사용하지 않는다.

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
