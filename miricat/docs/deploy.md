# 배포 가이드 (S4 화요일 — Vercel + Render)

구조: **프론트(Vercel) + 백엔드(Render) + DB(Supabase, 이미 클라우드) + 워커(로컬 유지)**

```
브라우저 ──▶ Vercel (React 정적 빌드)
                │  VITE_API_BASE로 API 직행
                ▼
             Render (Express) ──▶ Supabase
                ▲
로컬 워커(Python) ──▶ 디스코드 (경보 링크 = REPORT_BASE_URL/report/<id> → Vercel)
```

## 순서 (백엔드 먼저 — 프론트가 백엔드 주소를 알아야 하므로)

### 1. Render — 백엔드
- New Web Service → GitHub `jaehyun429/hub` 연결, 브랜치 `work`
- Root Directory: `miricat/backend` · Build: `npm install` · Start: `node index.js`
- 환경변수:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ODSAY_API_KEY`
  - (`PORT`는 Render가 자동 주입 — 코드가 `process.env.PORT || 8000`이라 대응됨)
- 주의: index.js의 dotenv는 `../.env`를 읽는데 배포 환경엔 그 파일이 없음 → dotenv가 조용히 넘어가고 Render 환경변수를 그대로 쓰므로 문제없음
- 확인: `https://<render-url>/api/health` → `{"ok":true,...}`

### 2. Vercel — 프론트
- Add New Project → 같은 레포, Root Directory: `miricat/frontend`
- Framework: Vite (자동 감지) · `vercel.json`의 SPA rewrite로 `/report/:id` 직진입·새로고침 대응
- 환경변수: `VITE_API_BASE=https://<render-url>` (**빌드 시점에 박히는 값** — 바꾸면 재배포 필요)
- 확인: 홈에서 경로 목록 로드 + `/report/<uuid>` 직접 접속

### 3. 로컬 워커 — 링크 갱신
- `miricat/.env`의 `REPORT_BASE_URL`을 `https://<vercel-url>`로 교체
- 확인: `demo_alert.py` 발사 → 디스코드 경보 제목 클릭 → **Vercel 리포트**가 열림

## 배포 후 체크리스트
- [ ] `/api/health` OK (Render)
- [ ] 홈 로드 + 정류장 검색 동작 (Vercel → Render → ODsay 왕복)
- [ ] `/report/<uuid>` 새로고침해도 열림 (SPA rewrite)
- [ ] 디스코드 경보 링크가 Vercel 주소 (localhost 아님!)
- [ ] CORS: 백엔드가 `cors()` 전체 허용이라 통과 — 여유 되면 Vercel 도메인으로 좁히기

## 함정 노트
- `VITE_API_BASE` 없이 배포하면 프론트가 자기 자신(`/api/...`)에 요청 → Vercel엔 API가 없어서 404. dev에선 Vite 프록시가 있어 값 없이 동작하는 것.
- Render 무료 플랜은 요청 없으면 잠들었다가 첫 요청에 ~30초 걸림 → 데모 전에 미리 한 번 깨워둘 것.
