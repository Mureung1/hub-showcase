# Task Packet: APP-001

## 1. Summary

```text
Task: 제품 웹과 문서 배포 경계 분리
Backlog ID: APP-001
Parent Epic: EPIC-04
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

Vercel 루트는 실제 LocalTwin 제품 웹을 제공하고, 문서 허브와 legacy prototype은 별도 경로와 역할로 분리한다.

## 3. Scope

포함:

```text
/ → React 제품 웹
/docs/... → 문서 허브
/prototype... → / legacy redirect
README와 Docs Home 제품 링크 갱신
docs/prototypes 정적 파일은 역사 기록으로 보존
```

제외:

```text
제품 기능 전체 재설계
실제 분석 API 연결
Gaussian Splatting worker
legacy 문서 일괄 삭제
```

## 4. Related Documents

```text
docs/development/architecture.md
docs/development/document-management.md
docs/wiki/Home.md
```

## 5. Expected Changes

```text
deploy: Vercel root와 redirect
docs: 제품/문서 링크와 legacy 표기
```

## 6. Acceptance Criteria

- [x] Vercel 루트가 React 제품 웹을 연다.
- [x] Docs 버튼과 문서 URL은 `/docs/...`에서 유지된다.
- [x] `/prototype`은 제품 루트로 이동한다.
- [x] Docs Home의 주 CTA가 제품 웹으로 연결된다.
- [x] 정적 prototype 파일은 legacy 기록으로 남는다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web build
python scripts/check_docs_html.py
Get-Content vercel.json | ConvertFrom-Json
```

수동 확인:

```text
제품 루트의 상권 분석 UI
Docs Home과 Docs 복귀 link
legacy /prototype redirect
```

## 8. Documentation Updates

- [x] README에 제품 웹과 문서 URL 분리
- [x] Docs Home CTA를 Product로 변경
- [x] 정적 prototype을 legacy로 표기
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(app): make the product web the public root

why:
- separate the production application from its documentation and legacy prototype

verify:
- pnpm --dir product/apps/web test
- pnpm --dir product/apps/web build
- python scripts/check_docs_html.py
```

## 10. Self-check

- [x] 제품 화면을 문서 사이트의 부속 prototype처럼 표기하지 않았는가?
- [x] 문서 URL과 Docs 복귀 link를 유지했는가?
- [x] legacy 파일을 현재 제품과 혼동하지 않게 했는가?
- [ ] 후속: 실제 분석 API 연결 전까지 demo fixture 표시는 유지한다.
