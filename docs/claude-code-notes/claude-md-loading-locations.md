# Claude Code 노트 — CLAUDE.md 로딩 위치

> 작성일: 2026-07-09 · 근거: 공식 문서 조회(claude-code-guide 서브에이전트, WebFetch)
> ⚠️ 이 문서는 조회 시점 기준 스냅샷이다. Claude Code 동작은 버전에 따라 바뀔 수 있으니, 중요한 결정 전에는 아래 출처를 다시 확인한다.

## 핵심 결론

프로젝트용 `CLAUDE.md`는 **두 위치 모두 자동 로드**된다.

> "A project CLAUDE.md can be stored in either `./CLAUDE.md` or `./.claude/CLAUDE.md`."

- `./CLAUDE.md` (저장소 루트) — 기본값, 가장 눈에 띔. `/init` 명령이 생성하는 위치.
- `./.claude/CLAUDE.md` — 기능상 동일. `settings.json`·`rules/` 등 설정과 **한곳에 모아(colocate)** 관리 가능.

**이 프로젝트(hub)는 `.claude/CLAUDE.md`를 채택** — `.claude/settings.local.json` 등 설정과 함께 두어 프로젝트 구성을 한곳에서 관리하기 위함.

## 메모리 파일 우선순위 (넓음 → 좁음)

1. **조직 정책(managed policy)** — 예: Linux/WSL `/etc/claude-code/CLAUDE.md`, macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`
2. **사용자 전역** — `~/.claude/CLAUDE.md` (모든 프로젝트 공통, 개인)
3. **프로젝트** — `./CLAUDE.md` **또는** `./.claude/CLAUDE.md` (팀 공유)
4. **로컬 개인** — `./CLAUDE.local.md` (현재 프로젝트, 비공유)
5. **추가 로드**
   - 하위 폴더의 `CLAUDE.md` — 그 폴더의 파일을 다룰 때 on-demand 로드
   - `.claude/rules/*.md` — 무조건 또는 경로 범위(frontmatter) 규칙
   - 자동 메모리 — `~/.claude/projects/<project>/memory/MEMORY.md`

## `.claude/` 폴더 용도

프로젝트 설정을 모으는 폴더:

| 항목 | 설명 |
|------|------|
| `CLAUDE.md` | 프로젝트 메모리(= 루트 `./CLAUDE.md`와 동일 효과) |
| `CLAUDE.local.md` | 개인용 프로젝트 오버라이드(비버전관리) |
| `rules/` | 경로 범위 지정 가능한 규칙 모음 |
| `settings.json` | 프로젝트 설정 |
| `settings.local.json` | 개인·로컬 설정 오버라이드 |

## 권장 (일반론)

- **새 프로젝트 기본**: 루트 `./CLAUDE.md` (가시성↑, `/init` 기본).
- **설정을 한곳에 모으고 싶으면**: `./.claude/CLAUDE.md` (본 프로젝트 선택).
- 둘은 기능상 동일하므로 **정리 방식의 선택**일 뿐이다.

## 출처

- 공식 문서: <https://code.claude.com/docs/en/memory.md>
  - 섹션: "Choose where to put CLAUDE.md files", "Set up a project CLAUDE.md", "How CLAUDE.md files load"
- 검증 경로: `claude-code-guide` 서브에이전트가 위 문서를 WebFetch로 조회해 확인.
