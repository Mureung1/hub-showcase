# 3. Agent 설계 — 문서로 AI를 붙잡아두기

처음엔 지침을 한 파일에 많이 넣으면 AI가 알아서 잘할 줄 알았다. 근데 문서가 커질수록 매번 불필요한 것까지 다 읽고, 어디가 최신 기준인지도 헷갈리고, 고칠 때 여러 군데가 동시에 어긋났다. 그래서 문서를 역할별로 나누고, AI가 어디까지 판단할지를 정해주는 쪽으로 방향을 틀었다.

## ① 진행한 내용

- `CLAUDE.md`에 항상 지킬 규칙을 모음 — 기술 스택 고정, 작업 종류별 기준 문서, 금지사항, 완료 보고 형식.
- 문서를 역할별로 분리 — product(제품 정의) / architecture(기술 구조) / domain-policy(상태·전이) / data-model(데이터 모델) / specs(기능별 Spec) / status(진행 상황) / decisions(결정 근거). AI가 전부 읽지 않고, 지금 작업에 필요한 문서·Spec만 읽게 함.
- 검증용 QA 에이전트 분리 — 읽기 전용, AC별 PASS/FAIL/NOT VERIFIED를 증거와 함께 기록, 심각도 BLOCKER/MAJOR/MINOR. 실행 안 한 검사를 통과로 보고 금지. 수정은 메인, QA는 검증만.

## ② 추가로 배운 개념

- 컨텍스트 엔지니어링 같은 것. AI가 매 작업에 뭘 읽느냐를 내가 조정한다는 감각.
- Markdown이 그냥 설명서가 아니라, AI의 판단 범위를 제한하는 인터페이스가 될 수 있다는 것.
- 서브에이전트 역할 분리. 구현이랑 검증을 같은 애한테 안 맡기는 이유.

## ③ 꼭 공부할 개념

- 프롬프트 엔지니어링 기본기
- 컨텍스트 엔지니어링(필요한 문서만 읽히기)
- 에이전트 워크플로우 패턴(프롬프트 체이닝·라우팅·평가자–생성자)
- 서브에이전트 역할 분리와 읽기 전용 리뷰

**학습 자료**

- [Anthropic — Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic — Prompt engineering overview](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Claude Code — Subagents](https://code.claude.com/docs/en/sub-agents)

## ④ 참고 링크 — 직접 만든 문서

- `CLAUDE.md`
- `.claude/agents/qa-reviewer.md`
- `docs/specs/index.md`
- `docs/decisions/ADR-001~004`

> 메모: QA 에이전트 문단은 핸드오프·CLAUDE.md 기록을 근거로 먼저 써둠. `qa-reviewer.md` 원문을 다시 확인해 세부(정확한 항목·문구)를 보강할 것.
