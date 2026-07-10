# Task Packet: DOCS-003

## 1. Summary

```text
Task: 4주 제품 백로그, 시스템 아키텍처와 문서 관리 기준 정리
Backlog ID: DOCS-003
Parent Epic: EPIC-01
Type: docs
Owner: N187_정현우
Status: done
```

## 2. Goal

개발자가 Home에서 전체 Task와 4주 계획을 바로 찾고, 현재/목표 아키텍처와 각 문서의 역할을 한 번에 이해할 수 있게 한다.

## 3. Scope

포함:

```text
현재 문서 전체 인벤토리와 중복 역할 감사
Epic -> Task 구조의 4주 제품 백로그
현재/목표 시스템 아키텍처
Wiki Home, Document Viewer와 Knowledge Graph 연결
중복 문서의 canonical/legacy/history 역할 표시
```

제외:

```text
제품 기능 코드 구현
GitHub Issue와 Project 자동 생성
기존 기록 문서 삭제
```

## 4. Related Documents

```text
docs/wiki/Home.md
docs/development/overview.md
docs/development/checklist.md
docs/wiki/localtwin-v0.1-execution-plan.md
docs/development/harness.md
docs/module-notes/localtwin-v0.1-scope.md
```

## 5. Expected Changes

```text
api: 없음
web: 없음
data: 없음
docs: backlog, architecture, document management와 navigation
tests: 문서 index, local link와 viewer normalization 검사
scripts: 없음
```

## 6. Acceptance Criteria

- [x] Home에서 `tasks.md`와 `architecture.md`를 바로 열 수 있다.
- [x] 큰 Task 아래 세부 Task가 ID, 우선순위, 상태, 주차와 완료 조건을 가진다.
- [x] 4주 개발 목표와 주차별 시연 결과가 정리된다.
- [x] 현재 구현과 목표 아키텍처가 구분된 구조도로 표시된다.
- [x] 중복 문서마다 canonical, support, history 또는 legacy 역할이 정해진다.
- [x] 모든 공개 문서가 Document Tree에 나타나고 local link 검사를 통과한다.
- [x] 모든 상세 Markdown 문서가 상단에서 섹션 흐름도와 목차를 자동 표시한다.
- [x] Home의 개발 운영 카드는 핵심 문서 4개만 우선 노출한다.
- [x] Document Tree의 모든 폴더가 파일 수와 역할을 짧게 설명한다.

## 7. Verification Plan

```powershell
python scripts/check_task_packet.py --root .
python scripts/check_docs_index.py
python scripts/check_docs_html.py
node scripts/check_doc_viewer_normalization.js
git diff --check
```

수동 확인:

```text
Wiki Home의 Tasks/Architecture 링크 확인
Mermaid 구조도의 GitHub/Vercel fallback 확인
backlog와 checklist가 서로 다른 역할로 설명되는지 확인
```

## 8. Documentation Updates

- [x] README와 Wiki Home 링크 필요
- [x] 전체 개발문서 갱신
- [x] checklist 역할 갱신
- [x] legacy 실행 계획 상태 표시
- [x] run report 작성

## 9. Commit Plan

```text
docs(planning): add four-week backlog and architecture

why:
- make the product work and document ownership visible from Wiki Home

verify:
- python scripts/check_docs_html.py
- powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

## 10. Self-check

- [x] 문서 정리 범위 밖의 제품 코드를 변경하지 않았는가?
- [x] 실제 구현 상태와 계획을 구분했는가?
- [x] 기존 기록을 현재 기준으로 오해하지 않게 표시했는가?
- [x] 모든 신규 문서가 Home과 Document Tree에 연결됐는가?
- [ ] commit과 공개 배포는 별도 요청에서 진행한다.
