# security-secrets.md — 시크릿·API 키 관리 가이드라인

> 목적: `OPENAI_API_KEY`·`GEMINI_API_KEY`·Supabase 키 등 민감정보가 **커밋·푸시·PR로 공개되지 않게** 한다. 로컬(내 Mac)에서는 실제 키로 동작하되, 저장소에는 예시(플레이스홀더)만 올린다.

## 1. 원칙 (한 줄)

**실제 값은 `.env`에만. `.env`는 커밋 금지. 저장소엔 `.env.example`(빈 플레이스홀더)만.**

## 2. 어디에 무엇을 두나

| 파일 | 커밋 | 내용 |
|---|---|---|
| `backend/.env` | ❌ **절대 금지** | 실제 `PORT`, `SUPABASE_URL/KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` |
| `backend/.env.example` | ✅ | 키 이름 + 빈 값(또는 주석). **실제 값 금지** |
| `frontend/.env` | ❌ | 실제 `VITE_API_BASE_URL` 등 |
| `frontend/.env.example` | ✅ | 예시만 |

- **프론트엔드는 비밀키를 다루지 않는다.** `VITE_` 프리픽스 변수는 **브라우저 번들에 그대로 노출**되므로, LLM 키 등 비밀은 절대 `VITE_`로 두지 않는다. LLM 호출은 backend 프록시를 통한다(`docs/llm-agent-plan.md` §4).

## 3. 자동 차단: pre-commit 훅

저장소에 `.githooks/pre-commit`이 있다. 스테이징된 변경에서 실제 `.env`·API 키·개인키 패턴을 발견하면 커밋을 막는다.

**활성화(각자 1회):**
```bash
npm run hooks:install     # = git config core.hooksPath .githooks
```
- 훅은 `.env.example`/`.env.sample`과 주석(`#`) 플레이스홀더는 통과시킨다.
- 오탐이 확실할 때만 `git commit --no-verify`로 우회(신중히).

> 훅은 로컬 방어선일 뿐이다. **근본 방어는 `.gitignore`(이미 `.env`·`.env.*` 무시) + 실제 값을 `.env`에만 두는 습관**이다.

## 4. 커밋·푸시·PR 전 체크리스트

- [ ] `git status`에 `.env`(예시 아님)가 없나?
- [ ] `git diff --cached`에 `sk-...`로 시작하는 문자열이나, `OPENAI_API_KEY`·`SUPABASE_..._KEY` 뒤에 실제 값이 채워진 줄이 없나?
- [ ] 새로 추가한 설정 파일·로그·백업(`*.local`, `*.log`)에 키가 섞이지 않았나?
- [ ] 프론트 번들(`VITE_`)에 비밀키를 넣지 않았나?
- [ ] `git log -p`(최근 커밋)에 과거 실수로 들어간 키가 없나?

## 5. 이미 커밋/푸시했다면 (사고 대응)

1. **키를 즉시 폐기(rotate)** 한다 — 제거보다 폐기가 먼저. 공개된 키는 이미 유출된 것으로 간주.
2. 새 키를 발급받아 `.env`에만 넣는다.
3. 히스토리에서 제거가 필요하면 `git filter-repo`(또는 BFG) 사용 — **단, force push는 사용자 명시 허가 후에만**(하드룰).

## 6. LLM 키를 넣을 때 (도입 시점)

`backend/.env.example`에 아래 플레이스홀더가 준비돼 있다. 실제 값은 `backend/.env`에만 채운다.
```
# OPENAI_API_KEY=
# GEMINI_API_KEY=
```
- 프론트가 아니라 **backend에서만** 읽는다(`process.env.OPENAI_API_KEY`).
- 도입 절차는 `docs/llm-agent-plan.md` §5, 게이트는 §0(G6).
