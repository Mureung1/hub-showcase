# Run Report: ARCH-002 product and documentation separation

## Summary

```text
Task: ARCH-002
Status: passed with deployment follow-up
Date: 2026-07-14
```

제품 실행 source와 data·실행 script·배포 설정을 `product/` 경계로 이동했다. 문서 배포는
제품 build에 `docs/`를 복사하지 않고 별도의 `dist/docs-site` artifact를 생성한다.

## Changed boundaries

```text
product/
  apps/web       React product
  apps/api       FastAPI product
  data           local canonical/raw/scene boundary
  scripts        product data and scene tools
  vercel.json    product-only deployment

docs/            documentation source
vercel.json      docs-only deployment
dist/docs-site   generated documentation artifact
```

제품의 Docs 링크는 `VITE_DOCS_URL`을 지원하며 기본값도 별도 문서 URL을 가리킨다. 기존
저장소 root `.env`는 읽거나 이동하지 않았고 실제 secret은 artifact에 포함하지 않았다.

## Verification

```text
pnpm --dir product install --frozen-lockfile: passed
pnpm --dir product typecheck: passed
pnpm --dir product lint: passed
pnpm --dir product test: web 7 passed, API 34 passed
pnpm --dir product build: passed
node scripts/build_docs_site.mjs: passed
python scripts/check_docs_html.py: passed
python scripts/check_docs_index.py: passed
python scripts/check_deploy_artifacts.py: passed
actual canonical API smoke (`3110562`, cafe, `20251`): HTTP 200
git diff --check: passed
```

Artifact 검사 결과:

```text
product/apps/web/dist: docs, source, test, secret-like file 없음
dist/docs-site: product source, app source, secret-like file 없음
두 artifact는 서로 중첩되지 않음
```

## Known limitations

- 공개 제품 Vercel 프로젝트와 새 URL은 이번 Task에서 생성하지 않았다.
- FastAPI hosting과 제품 origin 연결은 W2-D5 검색 통합 및 배포 Task에서 수행한다.
- 기존 root `.env` 값이 필요하면 사용자가 `product/.env`로 안전하게 옮겨야 한다.
- Vite의 큰 Spark·map chunk 경고는 기존 상태이며 기능 실패가 아니다.

## Next action

DB-001에서 Supabase PostgreSQL schema·migration과 전체 canonical seed를 구현한다.
