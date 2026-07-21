# Run Report: WEB-020 home brand link

## Summary

좌상단 LocalTwin 브랜드 링크가 현재 분석 화면 내부 anchor가 아니라 제품 홈 경로(`/`)로 이동하도록
수정했다. 따라서 분석 query parameter가 남지 않고 처음 방문한 화면 상태에서 다시 시작한다.

## Changes

- `App.tsx`의 브랜드 link `href`를 `#analysis`에서 `/`로 변경
- 해당 link의 목적지를 검증하는 App test 추가

## Verification

```text
Web App test: 12 passed
TypeScript typecheck: passed
git diff --check: passed
```

## Result

분석 URL에서 좌상단 LocalTwin을 누르면 `https://localtwin-product.vercel.app/`의 홈 경로로 이동한다.
