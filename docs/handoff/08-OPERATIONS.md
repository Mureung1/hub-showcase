# 08. 운영 — 배포·시연·문제 해결

- 기준: 2026-07-31
- 저장소의 `docs/demodeploy.md`가 정본이다. 이 문서는 그것을 핸드오프 맥락에서 다시 정리한 것이다.

---

## 1. 구성

| 대상 | 플랫폼 | 이유 |
|---|---|---|
| **web** | Netlify | 정적 호스팅 |
| **api** | **Render (always-on Web Service)** | SSE 스트림을 몇 분간 열어둬야 한다 |
| **DB·Auth** | Supabase | 기존 프로젝트 그대로 |

> ⚠️ **Vercel·서버리스 함수는 안 된다.** 이 서버는 SSE로 생성 전 과정을 밀고, 질문 하나가 2~3분 걸린다. 함수 실행 시간 제한에 걸린다.

---

## 2. 반드시 지켜야 할 설정 두 개

두 플랫폼 모두 **저장소 루트**를 빌드 기준으로 삼아야 한다.

| 플랫폼 | 항목 | 값 |
|---|---|---|
| Render | Root Directory | **비워둔다** (`apps/api` 금지) |
| Render | Build Command | `npm ci && npm run build` |
| Render | Start Command | `node apps/api/dist/server.js` |
| Render | Health Check Path | `/api/health` |
| Netlify | Base directory | **비워둔다** (`apps/web` 금지) |
| Netlify | Build command | `npm run build` |
| Netlify | Publish directory | `apps/web/dist` |

**하위 폴더로 잡으면 안 되는 이유 두 가지**

1. **npm workspaces** — `packages/shared`가 루트 install의 `prepare`에서 빌드된다. 하위에서 install하면 `shared/dist`가 안 생기고 빌드가 깨진다.
2. **`prompts/`가 저장소 루트에 있다** — 9개 프롬프트 파일이 런타임에 읽힌다. Root를 `apps/api`로 잡으면 배포에 포함되지 않아 **생성 요청이 전부 실패**한다.

---

## 3. 환경변수

### Render (api)

**없으면 서버가 기동조차 하지 않는 것**

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY          ← 시스템 쓰기용. 프론트에 절대 두지 않는다
AI_KEY_ENCRYPTION_KEY        ← openssl rand -base64 32
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
OPENROUTER_API_KEY           ← Manager 전용
MANAGER_MODEL                ← 예: qwen/qwen3.7-plus
CLIENT_ORIGIN                ← Netlify 주소
```

> ⚠️ **`OPENROUTER_API_KEY`·`MANAGER_MODEL`은 기본값이 없다.** 빠지면 Render 로그에 `OPENROUTER_API_KEY가 필요합니다.`가 찍히고 프로세스가 종료된다. 증상이 **"빌드 성공, 헬스체크 실패"**로 보여서 원인을 찾기 어렵다. 이걸 먼저 의심하라.

**나머지는 전부 기본값으로 두고 시작한다.** 전체 목록은 `06-CODE-MAP.md` §6.

- `PORT`는 Render가 주입하므로 **직접 설정하지 않는다**
- `SUPABASE_DB_URL`은 마이그레이션 전용이므로 **런타임 env에 넣지 않는다**

### Netlify (web)

```text
VITE_API_BASE_URL              ← Render 주소. 끝에 / 없이
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

> `VITE_` 접두 변수는 **브라우저에 그대로 노출된다.** Secret Key·AI 키는 절대 넣지 않는다.
> `VITE_` 변수는 **빌드 시점에 번들에 박히므로**, 값을 바꾸면 반드시 재배포해야 한다.

---

## 4. 배포 순서 — 한 번에 안 끝난다

Render는 Netlify 주소를, Netlify는 Render 주소를 알아야 한다. **순환 의존이다.**

```text
1. Render 생성        CLIENT_ORIGIN은 임시값 → https://<서비스>.onrender.com 확보
2. Netlify 생성       VITE_API_BASE_URL에 1의 주소 → https://<사이트>.netlify.app 확보
3. Render env 수정    CLIENT_ORIGIN에 2의 주소 → 재배포
4. Supabase Auth URL  Site URL·Redirect URL을 2의 주소로
5. 확인               로그인 → 질문 전송 → 3사 답변 → Manager → 최종 답변
```

**Supabase Auth URL** — Authentication → URL Configuration
- Site URL = `https://<사이트>.netlify.app`
- Redirect URLs에 `https://<사이트>.netlify.app/login` 추가
- 로컬 개발을 계속한다면 `http://localhost:5173`도 남겨둔다

---

## 5. 배포 전 클린 빌드 검증 (권장, 5분)

배포 환경은 **클린 체크아웃 + 루트 install**이다. 같은 조건을 먼저 재현하면 실패 대부분을 걸러낼 수 있다.

```bash
rm -rf /tmp/deploy-check
git clone . /tmp/deploy-check && cd /tmp/deploy-check

# 1. 커밋 누락 점검
ls prompts/answer/*/v1.md prompts/manager/*/v1.md | wc -l   # 9여야 한다
ls -la .env apps/api/.env apps/web/.env                      # 전부 없어야 한다

# 2. 클린 빌드
npm ci && npm run build
ls -la apps/web/dist/index.html apps/api/dist/server.js      # 둘 다 있어야 한다

# 3. env 없이 기동 → 즉시 거부되는지
env -i PATH="$PATH" node apps/api/dist/server.js 2>&1 | head -30

# 4. 번들 유출 점검
grep -rlE "sk-|service_role|SECRET_KEY|OPENROUTER" apps/web/dist/

rm -rf /tmp/deploy-check
```

> 3번은 `docs/demodeploy.md`의 "env 없으면 기동 실패" 서술이 실제로 맞는지 확인하는 것이다. 문서가 틀리면 배포 당일 로그를 봐도 원인을 못 찾는다.

---

## 6. 시연 — 시간 관리가 핵심이다

### 실제 소요 시간

```text
Render cold start        30~60초   ← 무료 플랜은 유휴 시 인스턴스를 내린다
3사 답변                 10~30초
Manager 판정             쟁점당 p50 83초 · p90 111초 (3개씩 병렬)
FinalAnswer 종합         15~33초
─────────────────────────────────
질문 하나 총계           2~3분
```

### 시연 전략

**① 시연 직전에 아무 페이지나 열어 서버를 깨워둔다.** cold start 30~60초는 시연에서 치명적이다.

**② 라이브 생성은 한 건만.** 나머지는 **미리 만들어둔 Chat**을 연다.

**③ 대기 시간을 침묵으로 보내지 마라.** 화면이 단계별로 갱신된다:
```text
source_answer.updated  →  3사 점등이 하나씩 켜진다
agenda.created         →  쟁점 목록이 나타난다
agenda.judged          →  쟁점별로 합의/충돌이 판정된다
final_answer.progress  →  최종 답변 생성
```
**이 과정 자체가 이 제품의 설명이다.** 진행 중 화면을 보여주면서 "지금 Manager가 세 답변을 쟁점 단위로 쪼개 비교하는 중"이라고 말하는 것이 시나리오다.

### 알아둘 것

- **AI 키 잔액** — 앱 기본 키 크레딧이 떨어지면 해당 Provider만 실패로 표시되고 나머지로 진행된다. 3사 전멸 시 고정 안내 문구로 마무리된다.
- **SSE 연결 유지** — 15초마다 heartbeat를 보내 중간 프록시가 유휴 연결을 끊지 않게 한다.
- **`?scenario=happy-path`는 Mock이 아니라 서버 경로다.** 무심코 고르면 3사 호출이 실제로 나간다(실제로 한 번 겪었다).

---

## 7. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| **빌드 성공, 헬스체크 계속 실패** | Render 로그에 `OPENROUTER_API_KEY가 필요합니다.` / `MANAGER_MODEL이 필요합니다.` → env 누락. 기본값이 없어 기동하지 않는다 |
| 3사 답변은 나오는데 그 뒤로 안 넘어감 | ① Render Root Directory가 루트인지(`prompts/manager/` 포함) ② OpenRouter 크레딧 ③ Render 로그의 Manager 오류 |
| 최종 답변이 "판단하지 못했습니다"류 | 단계 6 타임아웃 후 fallback. `MANAGER_JUDGE_TIMEOUT_MS`(120초) 확인. **정상 동작 범위이긴 하다** |
| 생성이 몇 분씩 걸림 | Manager 파이프라인 특성. **정상** |
| 브라우저 콘솔 CORS 오류 | Render `CLIENT_ORIGIN`이 Netlify 주소와 **정확히** 일치하는지(프로토콜·끝 `/` 포함). 수정 후 재배포 |
| 로그인은 되는데 API가 401 | Netlify `VITE_SUPABASE_*`와 Render `SUPABASE_*`가 **같은 프로젝트**인지 |
| 생성 시작이 `NO_AVAILABLE_KEYS` | Render의 AI 키 3종과 `APP_DEFAULT_AI_KEYS_ENABLED` |
| 생성 전부 실패(프롬프트 못 읽음) | Render Root Directory가 루트인지 |
| 이메일 인증 링크가 localhost로 감 | Supabase Site URL·Redirect URL |
| 첫 요청만 매우 느림 | Render cold start. 정상 |
| Zip 파일명이 macOS 터미널에서 깨짐 | Info-ZIP 6.00이 UTF-8 플래그를 무시하는 문제. **Zip은 정상**이고 Finder·`ditto`·Python은 올바로 읽는다. 생성 측에서 고칠 수 없다 |

---

## 8. 프롬프트를 고칠 때

프롬프트 9개는 **런타임에 파일로 읽는다.** 문구만 바꾸면 재빌드가 필요 없다.

**단, 프로세스 내 캐시가 있어 재배포(재기동)해야 반영된다.**

버전을 올리려면 `prompts/<kind>/v2.md`를 새로 만들고 해당 `*_PROMPT_VERSION` env를 바꾼다. **기존 파일을 그 자리에서 고치면, 이미 저장된 `prompt_version="v1"` 레코드와 구분할 수 없게 된다** — T-020.3에서 실제로 이렇게 했고, 데모 데이터를 재생성할 예정이라 그대로 두기로 했다.

---

## 9. 마이그레이션

```bash
supabase db push --db-url "$SUPABASE_DB_URL"
```

- `SUPABASE_DB_URL`은 **런타임 env에 넣지 않는다.** 마이그레이션 전용이다.
- 새 테이블을 만들면 **GRANT도 같이 줘야 한다.** RLS만으로는 `permission denied`가 난다(`20260720120100_grants.sql` 참고).
