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
```

`pnpm check`은 제품 web의 format, typecheck, lint, test, build와 API의 lint·test를 실행한다.
문서 HTML build는 제품 검증에 포함하지 않는다.

## Deployment

- 제품 Vercel 프로젝트: Root Directory `product`
- 문서 Vercel 프로젝트: 저장소 root의 `vercel.json`
- 제품 output: `product/apps/web/dist`
- 문서 output: `dist/docs-site`

현재 제품 데모 URL은 <https://localtwin-product.vercel.app>이고 API health endpoint는
<https://localtwin-api.onrender.com/health>이다. 배포 서비스가 일시적으로 sleep 상태일 수 있으므로
시연 전에 한 번 열어 API를 깨운다.
