# Run Report: APP-001 product web routing

## Summary

```text
Task: APP-001
Status: passed
Date: 2026-07-11
Implementation commit: 5d16d63
Documentation commit: 15c7db0
```

## Scope

```text
Vercel public root를 React 제품 웹으로 변경했다.
문서 허브는 /docs/... 경로에 유지했다.
이전 /prototype 경로는 제품 루트로 이동하게 했다.
docs/prototypes 정적 파일은 legacy 기록으로 보존했다.
```

## Changed Artifacts

```text
vercel.json
README.md
docs/wiki/Home.md
docs/wiki/doc-viewer.html
.harness/tasks/APP-001-product-web-routing.md
```

## Verification

```powershell
pnpm --dir apps/web test
pnpm --dir apps/web build
python scripts/check_docs_html.py
Get-Content vercel.json | ConvertFrom-Json
```

Production result:

```text
https://hub-localtwin-docs-vercel.vercel.app/ → LocalTwin React 제품 웹
/docs/wiki/doc-viewer.html?doc=Home.md → LocalTwin Docs Home
/prototype → / redirect 후 LocalTwin 제품 웹
```

## Notes

```text
사용자 작업 중인 design 문서 변경은 commit과 Vercel 배포에서 제외했다.
현재 제품은 실제 웹 경로를 사용하지만 분석 수치는 API 연결 전 demo fixture다.
```

## Follow-up

```text
SCORE-001과 DATA-002에서 공식 데이터와 설명 가능한 점수 API를 연결한다.
```
