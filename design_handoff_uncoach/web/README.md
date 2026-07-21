# 언코 — 풀스택 (Next.js + Postgres + Claude)

커스텀 DSL 프로토타입(`../index.html`)을 **Next.js 16 App Router** 풀스택으로 재구현한 버전.

- **프론트**: React 19 (App Router) + Tailwind v4
- **백엔드**: Route Handlers (`/api/score`, `/api/state`), Node 런타임
- **DB**: Postgres (Neon 등) — 기기별 상태 blob 저장
- **채점**: Claude(`claude-opus-4-8`) structured outputs, per-situation 루브릭 주입, 1~3 척도

## 구조

```
src/
  app/
    api/score/route.ts     채점 (Claude)
    api/state/route.ts     상태 로드/저장 (Postgres)
    page.tsx / layout.tsx  진입점
  components/
    AppShell.tsx           화면 라우팅 + 하단 탭바
    screens/               Onboarding·Home·Picker·Train·Trajectory
  lib/
    domain/                69개 상황 + 3축·루브릭·페르소나 (프로토타입 이식)
    scoring/               채점 프롬프트·스키마·Claude 호출
    db/                    postgres client·repo·schema
    server/device.ts       device_id 쿠키
    client/                store(상태) · api(fetch)
scripts/migrate.mjs        DB 스키마 적용
```

## 셋업

1. **환경변수**: `.env.local.example` → `.env.local` 복사 후 채우기
   - `DATABASE_URL` — Neon(neon.tech, 무료) pooled 연결 문자열 (`...-pooler...?sslmode=require`)
   - `GEMINI_API_KEY` — aistudio.google.com (채점·상황생성·뉴스·캡쳐 전부 이걸로)
2. **의존성**: `npm install`
3. **DB 마이그레이션**: `npm run migrate` (스키마 멱등 적용)
4. **개발 서버**: `npm run dev` → http://localhost:3000

> 키·DB 없이도 부팅됩니다. DB 없으면 상태는 localStorage 폴백, 키 없으면 채점·상황생성·뉴스·캡쳐만 503 안내.

## 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run typecheck` | 타입 검사 |
| `npm run migrate` | DB 스키마 적용 |

## 배포 (Vercel)

이 앱은 리포 루트가 아니라 **`web/` 하위**에 있으므로 Vercel에서 Root Directory를 지정해야 한다.

1. **Vercel → New Project → 이 GitHub 리포(`zer8m/uncoach`) import**
   - 예전 프록시(`uncoach-pi`)는 이미 죽어있음(삭제됨) — 이 프로젝트가 유일한 배포본이 된다.
2. **Settings → Build & Development → Root Directory = `web`**
   - Framework Preset: Next.js (자동 감지)
3. **Settings → Environment Variables** 에 추가:
   - `DATABASE_URL` = Neon pooled 연결 문자열
   - `GEMINI_API_KEY` = Gemini 키 (채점·상황생성·뉴스·캡쳐 전부)
4. **Deploy.** 이후 `web/` 변경 push 시 자동 배포.
5. 배포 후 최초 1회 DB 스키마 적용: 로컬에서 `DATABASE_URL` 세팅하고 `npm run migrate`
   (또는 Neon 콘솔 SQL 에디터에 `src/lib/db/schema.sql` 붙여넣기).

> **함수 실행 시간**: 채점(`/api/score`)은 응답이 수 초~수십 초 걸릴 수 있어 route에
> `maxDuration = 60`을 뒀다. Vercel **Hobby(무료)** 는 함수 최대 실행이 제한적이라
> 길어지면 `SCORING_MODEL`을 더 빠른 모델(`gemini-2.5-flash-lite` 등)로 낮춘다.

## 라이브 프로토타입과의 관계

- 리포 루트에 있던 **커스텀 DSL 프로토타입**(`index.html`, Firebase Hosting)은 삭제됨 — 라이브를 이 `web/`(Vercel)로 일원화하기로 결정.
- Firebase Hosting(`unco-965ab.web.app`)엔 예전 빌드가 고아 상태로 남아있지만 더 이상 갱신하지 않는다.
