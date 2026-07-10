# Task Packet: DOCS-002

## 1. Summary

```text
Task: Vercel 문서 트리, 배포 접근성, PR CI와 충돌 복구
Type: fix
Owner: Codex
Status: done
```

## 2. Goal

```text
Home 최하단에서 모든 docs 문서를 폴더별로 접고 펼치며 바로 열 수 있게 한다.
docs-only Vercel 배포의 모든 문서와 내부 링크를 확인한다.
PR #3의 setup-uv 오류와 main/develop 충돌을 해결한다.
```

## 3. Scope

포함:

```text
docs/wiki/doc-viewer.html Home 문서 트리
문서 트리 누락 검증
week1-thursday-progress-report.md 공개 링크 점검
astral-sh/setup-uv action pin 수정
main/develop 충돌 해결
docs-only Vercel 재배포와 URL 검증
```

제외:

```text
제품 prototype 기능 변경
상권 분석 기능 구현
intro page 복구
GitHub repository 설정 변경
```

## 4. Related Documents

```text
docs/wiki/Home.md
docs/wiki/doc-viewer.html
docs/development/week1-thursday-progress-report.md
docs/development/validation.md
docs/development/git-workflow.md
```

## 5. Expected Changes

```text
docs: collapsible document tree and public-link correction
scripts: document-tree completeness check
ci: setup-uv action reference
git: conflict resolution merge
```

## 6. Acceptance Criteria

- [x] 모든 `docs/**/*.md`와 `docs/**/*.html`이 Home 문서 트리에 표시된다.
- [x] 각 폴더를 keyboard와 pointer로 접고 펼칠 수 있다.
- [x] 각 파일에서 해당 Markdown viewer 또는 HTML 문서로 이동할 수 있다.
- [x] `week1-thursday-progress-report.md`가 docs-only Vercel 배포에서 열린다.
- [x] 공개 배포의 모든 문서 URL과 내부 링크가 성공한다.
- [x] CI가 존재하지 않는 `setup-uv@v8` tag를 참조하지 않는다.
- [x] `.gitignore`, `package.json` 충돌 해결이 PR #4를 통해 `main`에 반영된다.
- [x] 폐기된 root intro application을 활성 개발환경에 다시 포함하지 않는다.

## 7. Verification Plan

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
git diff --check
```

배포 후:

```text
Vercel의 모든 docs Markdown/HTML URL 상태 확인
Home 문서 트리 screenshot과 접기/펼치기 interaction 확인
공개하지 않는 내부 경로가 404인지 확인
```

## 8. Documentation Updates

- [x] README 문서 링크 확인
- [x] Wiki Home 카드와 Document Tree 구조 확인
- [x] validation failure log와 run report 갱신
- [x] 기능 spec과 data mapping 변경 없음 확인

## 9. Commit Plan

```text
fix(ci): pin the setup-uv action release
feat(docs): add a collapsible document tree
test(docs): verify the public document tree
fix(git): resolve the main branch conflicts
docs: record docs deployment verification
```

## 10. Self-check

- [x] 변경이 요청한 문서/CI/충돌 범위 안에 있는가?
- [x] 사용자 소유 디자인 비교 문서를 내용 변경 없이 공개 문서에 포함했는가?
- [x] local과 deployed behavior를 각각 확인했는가?
- [x] local develop conflict 해결과 원격 PR 상태를 구분했는가?
- [ ] 원격 GitHub Actions 최종 conclusion은 push 후 GitHub UI에서 확인한다.
