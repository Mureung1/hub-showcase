# 001 — 현재 실행 그래프와 우연한 의존성을 고정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

현재 dev·dogfood AY-PLE를 `npm run dev`로 시작해 한 Product Turn에서 AY가 command를 실행할 때까지 실제 process·executable·environment graph는 무엇이며, 각 binary·library·root 중 AY-PLE이 의도적으로 pin·verify하는 것과 host에서 우연히 들어오는 것은 무엇인가?

## Expected evidence

- root launcher·Vite·Server → bundled Python bridge → native Codex App Server → spawned AY command와 Interaction MCP의 process·cwd·environment 흐름
- Node, npm, tsx, Python, pip, native Codex, shell, Git, `rg`와 대표 OS command의 exact resolution·version·provenance 표
- Bridge-private Python packages와 AY shell Python import path, SemesterWorkspace에서의 Node module resolution 차이
- `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `TMPDIR`, `PATH`, protected variable와 writable root의 owner
- actual child와 같은 environment를 사용하는 반복 가능한 probe, current tests가 보장하는 것과 보장하지 않는 것
- repo-built Interaction MCP entrypoint의 Node provenance·artifact verification·startup 책임
- ambient dependency, silent fallback, host-specific behavior와 문서·코드 불일치 목록
