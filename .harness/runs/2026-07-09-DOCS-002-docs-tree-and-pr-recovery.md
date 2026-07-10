# Run Report: 2026-07-09-DOCS-002

## 1. Task

```text
Task packet: .harness/tasks/DOCS-002-docs-tree-and-pr-recovery.md
Branch: develop
Status: passed
```

## 2. Changed Files

```text
docs/wiki/doc-viewer.html
docs/development/week1-thursday-progress-report.md
docs/prototypes/design-guide-visual-comparison.html
scripts/check_docs_html.py
scripts/check.ps1
.github/workflows/ci.yml
.gitignore
docs/evaluation/failure-log.md
```

## 3. Summary

```text
Home 최하단에 모든 docs Markdown/HTML을 표시하는 접기/펼치기 트리를 추가했다.
개발환경, 컨벤션, 결정 Gate와 1주차 보고서를 Development 카드에 배치했다.
사용자 작성 디자인 비교 HTML을 내용 변경 없이 공개 문서 집합에 포함했다.
setup-uv v8.1.0 release SHA를 pin해 존재하지 않는 v8 tag 오류를 수정했다.
main을 develop에 병합하고 폐기된 root intro 앱을 되살리지 않은 채 local conflict resolution을 준비했다.
check.ps1가 native command 실패를 성공으로 처리하던 문제를 수정했다.
docs-only Vercel production alias를 갱신했다.
```

## 4. Verification

명령:

```powershell
pnpm install --frozen-lockfile
uv sync --directory apps/api --frozen
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
python scripts/check_docs_html.py
git diff --check
```

배포 검증:

```text
Production alias: https://hub-localtwin-docs-vercel.vercel.app
public index + docs requests: 29/29 HTTP 200
private paths: 4/4 HTTP 404
Home Development card links present
development folder collapse/expand passed
environment.md navigation passed
week1-thursday-progress-report.md navigation passed
desktop and mobile document-tree layout passed
fresh browser session console errors: 0
```

검증기 회귀 확인:

```text
fake pnpm exit code 7 -> scripts/check.ps1 exit code 1
failure path did not print "Harness check passed"
normal repository check passed
```

## 5. Self-check

| Criterion | Result | Note |
| --- | --- | --- |
| Scope | pass | 문서 허브, CI와 PR conflict 범위만 변경했다. |
| Correctness | pass | tree completeness check와 실제 browser navigation을 확인했다. |
| Verification | pass | local, packaged, deployed 검증을 분리해 실행했다. |
| Documentation | pass | 공개 1주차 보고서와 failure log를 갱신했다. |
| Data discipline | pass | 제품 data와 schema를 변경하지 않았다. |
| Safety | pass | 내부 harness, scripts, apps와 env template은 공개하지 않았다. |
| Git hygiene | pass | CI, 문서 artifact, tree, merge와 validation fix를 분리했다. |

## 6. Known Limitations

```text
PR #4가 main의 bed2aeb로 병합된 것을 remote ref에서 확인했다.
GitHub branch protection 설정은 repository settings에서 별도로 확인해야 한다.
README.md는 GitHub 진입점이며 Vercel 공개 파일 집합에서는 제공하지 않는다.
```

## 7. Next Action

```text
다음 제품 task를 시작하기 전에 GitHub branch protection 설정을 확인한다.
```
