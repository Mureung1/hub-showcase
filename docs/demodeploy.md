# 데모 배포 체크리스트

> Decision Log를 데모용으로 올리기 위한 실행 순서다. 위에서 아래로 그대로 따라가면 된다.
> 실제 배포·계정·시크릿 입력은 운영자(Brett)가 수행한다. 이 문서에는 **실제 키를 적지 않는다.**

- **web**: Netlify (정적 호스팅)
- **api**: Render (always-on 웹서비스 — 서버리스 함수 아님. SSE 스트림을 오래 열어둬야 한다)
- **DB·Auth**: 기존 Supabase 프로젝트 그대로

---

## 0. 배포 전 로컬 확인 (권장, 5분)

배포 환경은 **클린 체크아웃 + 루트 install**로 빌드한다. 같은 조건을 로컬에서 먼저 확인하면 배포 실패를 대부분 걸러낼 수 있다.

```bash
git clone <repo> /tmp/deploy-check && cd /tmp/deploy-check
npm ci                 # 루트에서. workspaces가 shared를 prepare로 빌드한다
npm run build          # shared → api → web 순서
ls apps/web/dist/index.html apps/api/dist/server.js   # 둘 다 있어야 한다
```

`apps/web/dist`가 생성되지 않거나 shared 타입 오류가 나면, **install을 루트가 아닌 하위 폴더에서 돌린 것**이 원인일 가능성이 높다(아래 Netlify base 설정 주의 참고).

---

## 1. Render — api 웹서비스

### 서비스 설정

| 항목 | 값 |
|---|---|
| 타입 | Web Service (**Background Worker·Cron 아님**) |
| Root Directory | **저장소 루트** (비워둔다. `apps/api`로 지정하지 말 것 — 아래 주의) |
| Build Command | `npm ci && npm run build` |
| Start Command | `node apps/api/dist/server.js` |
| Health Check Path | `/api/health` |

> ⚠️ **Root Directory를 `apps/api`로 잡으면 안 된다.**
> ① npm workspaces라 `shared` 빌드가 루트 install에서 일어난다.
> ② 답변 프롬프트(`/prompts`)가 **저장소 루트**에 있고, `ANSWER_PROMPTS_DIR` 기본값이 `apps/api/dist/shared/config` 기준 상대 경로로 루트 `/prompts`를 가리킨다. Root를 `apps/api`로 잡으면 `/prompts`가 배포에 포함되지 않아 **생성 요청이 전부 실패**한다.

### `/prompts` 배포 포함 여부

- `/prompts/answer/{claude,openai,gemini}/v1.md`는 저장소에 커밋되어 있고 `.gitignore` 대상이 아니다 → **루트를 배포하면 자동 포함된다.**
- 별도 설정은 필요 없다. 다른 위치에 두고 싶을 때만 `ANSWER_PROMPTS_DIR`에 절대 경로를 지정한다.
- 프롬프트는 런타임에 읽는 텍스트라 문구만 고치면 재빌드가 필요 없다. 단, 프로세스 내 캐시가 있어 **재배포(재기동)해야 반영**된다.

### 환경변수 (Render 대시보드 → Environment)

**필수**

| 키 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | 공개 키(anon/publishable) |
| `SUPABASE_SECRET_KEY` | Secret/service_role 키 — **시스템 쓰기용, 절대 프론트에 두지 않는다** |
| `AI_KEY_ENCRYPTION_KEY` | BYOK 암호화 마스터 키(base64 32바이트). `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | 앱 기본 Claude 키 |
| `OPENAI_API_KEY` | 앱 기본 OpenAI 키 |
| `GEMINI_API_KEY` | 앱 기본 Gemini 키 |
| `CLIENT_ORIGIN` | **Netlify 주소**(예: `https://<사이트>.netlify.app`). CORS 허용 출처 |

**선택(기본값 있음)**

| 키 | 기본값 | 설명 |
|---|---|---|
| `APP_DEFAULT_AI_KEYS_ENABLED` | `true` | 사용자 키가 없을 때 앱 기본 키 사용 여부. `true`면 위 AI 키 3종이 필수 |
| `ANSWER_PROMPT_VERSION` | `v1` | 사용할 프롬프트 버전(`prompt_version`에 스탬프) |
| `ANSWER_NORMALIZER_VERSION` | `v1` | 활성 정규화기 버전 |
| `ANSWER_PROMPTS_DIR` | 저장소 루트 `/prompts` | 프롬프트 템플릿 루트 |
| `CLAUDE_MODEL` | `claude-haiku-4-5` | 최소 티어 기본값 |
| `OPENAI_MODEL` | `gpt-5-nano` | 최소 티어 기본값 |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | 최소 티어 기본값 |

- `PORT`는 Render가 주입하므로 **직접 설정하지 않는다**(서버가 `process.env.PORT`를 읽는다).
- `SUPABASE_DB_URL`은 마이그레이션 적용 전용이라 **런타임 env에 넣지 않는다**.
- 값이 빠지면 서버가 기동 시 어떤 키가 문제인지 알리고 종료한다(키 값은 로그에 남기지 않는다).

---

## 2. Netlify — web 정적 사이트

| 항목 | 값 |
|---|---|
| Base directory | **저장소 루트** (비워둔다) |
| Build command | `npm run build` |
| Publish directory | `apps/web/dist` |

> ⚠️ **Base를 `apps/web`으로 잡으면 안 된다.** npm workspaces라 `shared`가 **루트 install의 prepare 단계**에서 빌드된다. base를 `apps/web`으로 두면 install이 그 하위에서 돌아 `shared`의 `dist`가 생기지 않고 web 빌드가 깨질 수 있다. 루트에서 `npm run build`를 돌리면 shared → api → web 순서로 빌드되고, 그 결과 중 `apps/web/dist`만 publish 하면 된다.

### 환경변수 (Netlify → Site settings → Environment variables)

| 키 | 값 |
|---|---|
| `VITE_API_BASE_URL` | **Render 주소**(예: `https://<서비스>.onrender.com`). 끝에 `/` 없이 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 공개 키 |

> `VITE_` 접두 변수는 **브라우저에 그대로 노출된다.** Secret Key·AI 키는 절대 여기 넣지 않는다.

---

## 3. Supabase 대시보드 — Auth URL

Netlify 주소를 받은 뒤 변경한다.

- Authentication → URL Configuration → **Site URL** = `https://<사이트>.netlify.app`
- **Redirect URLs**에 `https://<사이트>.netlify.app/login` 추가 (회원가입 인증 링크 도착지)
- 로컬 개발을 계속한다면 기존 `http://localhost:5173`·`http://localhost:5173/login`도 남겨둔다

---

## 4. 배포 순서 (상호 의존 주의)

Render는 Netlify 주소를, Netlify는 Render 주소를 알아야 한다. **한 번에 끝나지 않는다.**

1. **Render 먼저 생성** — `CLIENT_ORIGIN`은 일단 비워두거나 임시값. 배포 후 `https://<서비스>.onrender.com` 주소 확보
2. **Netlify 생성** — `VITE_API_BASE_URL`에 1에서 받은 Render 주소를 넣고 배포. `https://<사이트>.netlify.app` 주소 확보
3. **Render env 수정** — `CLIENT_ORIGIN`에 2의 Netlify 주소 입력 → **재배포**
4. **Supabase Auth URL** 을 2의 주소로 변경 (3장)
5. **확인** — Netlify 사이트에서 로그인 → 질문 전송 → 3사 답변 수신

`VITE_` 변수는 **빌드 시점에 번들에 박히므로**, Netlify env를 바꾸면 반드시 재배포해야 반영된다.

---

## 5. 데모 시 알아둘 것

- **Cold start**: Render 무료 플랜은 유휴 시 인스턴스를 내린다. 첫 요청이 **30~60초** 걸릴 수 있다. 시연 직전에 아무 페이지나 열어 미리 깨워둔다.
- **첫 질문은 특히 느리다**: cold start + 3사 실호출(각 최대 45초·실패 시 1회 재시도)이 겹친다. 깨워둔 상태라면 보통 10~30초.
- **SSE 연결 유지**: 생성 스트림은 15초마다 heartbeat 프레임을 보내 중간 프록시가 유휴 연결을 끊지 않게 한다.
- **AI 키 잔액**: 앱 기본 키의 크레딧이 떨어지면 해당 Provider만 실패로 표시되고 나머지로 진행된다(3사 전멸 시 고정 안내 문구로 마무리).

---

## 6. 문제가 생기면

| 증상 | 확인할 것 |
|---|---|
| 브라우저 콘솔에 CORS 오류 | Render `CLIENT_ORIGIN`이 Netlify 주소와 **정확히** 일치하는지(프로토콜·끝 `/` 포함). 수정 후 재배포 |
| 로그인은 되는데 API가 401 | Netlify `VITE_SUPABASE_*`와 Render `SUPABASE_*`가 **같은 프로젝트**인지 |
| 생성 시작이 `NO_AVAILABLE_KEYS` | Render의 AI 키 3종과 `APP_DEFAULT_AI_KEYS_ENABLED` 확인 |
| 생성이 전부 실패(프롬프트 못 읽음) | Render Root Directory가 저장소 루트인지(=`/prompts` 포함) |
| 이메일 인증 링크가 localhost로 감 | Supabase Site URL·Redirect URL이 Netlify 주소인지 |
| 첫 요청만 매우 느림 | Render cold start. 정상 |
