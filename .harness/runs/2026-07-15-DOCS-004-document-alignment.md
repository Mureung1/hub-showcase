# Run Report: DOCS-004

## Summary

```text
Task: 실제 구현 결과로 스펙·아키텍처·백로그 마감
Status: passed
Date: 2026-07-15
Scope: current/canonical 문서, 공개 문서 허브와 배포 artifact
```

과거 Progress Report, legacy 실행 계획과 기존 Run Report는 당시 증거로 보존했다. 현재 기준 문서만 실제 코드, canonical DB와 2026-07-15 검증 결과에 맞췄다.

## Aligned Evidence

| 항목 | 문서에 반영한 현재 상태 |
| --- | --- |
| canonical DB | 7개 table, `store_points` 537,489행, `store_metrics` 304,775행 |
| PostgreSQL 전환 | SQLAlchemy/Alembic/local seed 구현, 실제 Supabase 적용은 미완료 |
| API | 47 test 통과 |
| Web | 10 test, typecheck와 production build 통과 |
| Scene | 공식 `storefront` sample 학습·export·viewer 검증, 사용자 촬영 E2E·익명화 미완료 |
| Security | SEC-001 A단계 Verified, B단계와 SEC-002~008 Planned |
| MAP-004 | 꽃집 procedural prototype·custom layer test 진행, 실제 검색·검증 업종 연결 미완료 |

## Documentation Verification

```text
Docs index check: passed
Docs HTML and local link check: passed
Viewer URL normalization: passed
Task Packet check: 36 packets passed
Docs production build: passed
Git diff check: passed
Product artifact boundary: passed
Documentation artifact boundary: passed
```

사용 명령:

```powershell
python scripts/check_docs_index.py
python scripts/check_docs_html.py
node scripts/check_doc_viewer_normalization.js
python scripts/check_task_packet.py --root . --require
npm run build:docs
python scripts/check_deploy_artifacts.py --docs-artifact dist/docs-site --product-artifact product/apps/web/dist
git diff --check
```

## Deployment Verification

```text
Vercel deployment: dpl_GGCeDvSbPCyau56V6oZrXDnbfDKK
Target: production
Production alias: https://hub-localtwin-docs-vercel.vercel.app
Root: HTTP 200
Document Viewer Home: HTTP 200
Architecture Markdown: HTTP 200, final update 2026-07-15 confirmed
Map specification Markdown: HTTP 200, 3D Store Marker title confirmed
```

## Remaining Product Work

문서 최신화가 제품 전체 완료를 뜻하지 않는다. 실제 Supabase 적용, 공간 결합·반경 query, 검색·filter 통합, SEC-001 B단계와 SEC-002~008, 사용자 촬영 Scene E2E와 공개 제품 배포는 `tasks.md`에 미완료로 유지한다.
