# Task Packet: ARCH-002

## 1. Summary

```text
Task: 실제 서비스 source와 문서 배포 경계 분리
Backlog ID: ARCH-002
Parent Epic: EPIC-01 / EPIC-04
Type: feature/security
Owner: N187_정현우
Status: done
```

## 2. Goal

현재 URL route 분리를 물리 폴더와 독립 배포 artifact 분리로 확장한다.

## 3. Scope

- 제품 source를 product/ 경계로 이동
- 제품 build에서 내부 docs 제외
- 문서 build에서 제품 source 제외
- 기존 제품·문서 URL 회귀 확인

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/development/architecture.md`
- `docs/development/validation.md`
- `docs/issues/security-hardening-review.md`

## 5. Expected Changes

- 요청 범위의 code/config/test/document만 수정한다.
- 실제 secret, 사용자 촬영 원본과 로컬 절대 경로는 기록하지 않는다.

## 6. Acceptance Criteria

- [x] 제품 artifact에 내부 개발 문서가 없다.
- [x] 문서 artifact에 제품 source와 secret 파일이 없다.
- [x] 제품과 문서 build가 각각 통과한다.
- [x] 기존 route 또는 새 공개 URL의 이동 경로가 문서화된다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web build
node scripts/build_docs_site.mjs
python scripts/check_deploy_artifacts.py
python scripts/check_docs_html.py
python scripts/check_docs_index.py
git diff --check
```

명령 성공과 완료 조건 충족을 구분해 Run Report에 기록한다.

## 8. Documentation Updates

- [x] `docs/development/tasks.md` 상태를 실제 결과로 갱신한다.
- [x] 관련 기능 문서와 Run Report를 갱신한다.

## 9. Commit Plan

```text
refactor(structure): separate product and docs artifacts
```

## 10. Self-check

- [x] 범위 밖의 refactor나 dependency를 추가하지 않았다.
- [x] 사용자 변경과 secret을 덮어쓰거나 노출하지 않았다.
- [x] 최소 의미 검증과 남은 한계를 기록했다.
- [ ] 후속 DEPLOY-001에서 별도 제품 Vercel 프로젝트와 공개 URL을 검증한다.
