# Task Packet: DOCS-004

## 1. Summary

```text
Task: 실제 구현 결과로 스펙·아키텍처·백로그 마감
Backlog ID: DOCS-004
Parent Epic: EPIC-06
Type: documentation
Owner: N187_정현우
Status: done
```

## 2. Goal

현재 코드, canonical DB와 검증 결과를 기준으로 current/canonical 문서의 구현 상태·수치·링크를 맞추고, 과거 기록과 아직 검증하지 않은 목표를 명확히 분리한다.

## 3. Scope

포함:

```text
README와 Wiki Home 문서 진입점
Architecture, Environment, Tasks와 Document Management
Data Source Mapping과 DB 상태
Map, Market Analysis, 3D Scene 기능 스펙
Design System과 Security checklist
current/canonical 문서의 오래된 상태·수치·링크 감사
문서 build, link, HTML과 배포 artifact 검증
```

제외:

```text
history·legacy 문서를 현재 상태로 덮어쓰기
제품 source refactor 또는 미완료 기능을 완료로 변경
로컬 구현을 실제 Supabase·공개 제품 배포 완료로 표현
사용자 작업 중인 제품 코드와 secret 수정·commit
```

## 4. Related Documents

- `docs/development/document-management.md`
- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `docs/development/environment.md`
- `docs/data/data-source-mapping.md`
- `docs/issues/security-hardening-review.md`

## 5. Expected Changes

```text
stale implementation language and row/test counts
local implementation vs remote deployment boundary
official GPU sample vs user-captured Scene boundary
SEC-001 A verified vs B planned boundary
MAP-004 prototype in progress vs product integration incomplete
renamed map specification link labels
```

## 6. Acceptance Criteria

- [x] 구현 전 단계라는 오래된 Environment 설명이 현재 Phase 2 상태로 바뀐다.
- [x] canonical row count와 API test count가 최신 검증 결과와 일치한다.
- [x] PostgreSQL local 구현과 실제 Supabase 적용 미완료가 구분된다.
- [x] 공식 sample 3DGS 검증과 사용자 촬영 E2E 미완료가 구분된다.
- [x] SEC-001 A단계와 B단계 상태가 구분된다.
- [x] MAP-004 first slice와 남은 실제 검색·업종 연결이 구분된다.
- [x] history·legacy·기존 Run Report는 당시 기록으로 보존한다.
- [x] 문서 index, HTML, Viewer normalization과 docs build가 통과한다.
- [x] docs 배포 artifact에 product source·raw data·secret이 포함되지 않는다.
- [x] 공개 docs URL에서 갱신된 문서가 열린다.

## 7. Verification Plan

```powershell
python scripts/check_docs_index.py
python scripts/check_docs_html.py
node scripts/check_doc_viewer_normalization.js
python scripts/check_task_packet.py --root . --require
npm run build:docs
python scripts/check_deploy_artifacts.py --docs-artifact dist/docs-site --product-artifact product/apps/web/dist
git diff --check
```

## 8. Documentation Updates

- [x] 현재 기준 문서의 상태·수치·링크를 감사한다.
- [x] `docs/development/tasks.md`에서 DOCS-004를 In Progress로 갱신한다.
- [x] 검증 결과를 `.harness/runs/`에 기록한다.
- [x] 검증과 공개 배포가 끝나면 DOCS-004 완료 여부를 다시 판정한다.

## 9. Commit Plan

```text
docs: align current documentation with phase 2 state
```

## 10. Self-check

- [x] 과거 증거 문서를 현재 상태로 덮어쓰지 않았다.
- [x] 검증하지 않은 기능을 완료로 표현하지 않았다.
- [x] 사용자 작업 중인 제품 source와 secret을 수정하지 않았다.
- [x] 링크·build·artifact 검증 결과와 미검증 범위를 Run Report에 남긴다.
- [ ] 후속 제품 Task가 완료될 때 같은 문서 감사를 다시 수행한다.
