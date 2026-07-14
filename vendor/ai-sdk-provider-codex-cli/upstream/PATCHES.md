# AY-PLE fork patch ledger

이 문서는 upstream diff를 복사하지 않고, donor baseline 이후의 local semantic patch와 검증 근거를 찾기 위한 index다. Commit hash는 Git history가 소유하며 각 patch commit은 가능하면 `Fork-Patch: <ID>` trailer를 사용한다.

| Patch ID | Category | Paths | Intent | Verification | Upstream disposition | Supersedes |
| -------- | -------- | ----- | ------ | ------------ | -------------------- | ---------- |

현재 source·test·package file에 적용된 local semantic patch는 없다. `UPSTREAM.md`와 `upstream/*`는 provenance metadata이며 donor source 변경으로 세지 않는다.
