# 배포·데모 영상·작업 과정 기록

> 배포 확인일: 2026-07-30
>
> 공개 배포 사이트: [CV2PF on Vercel](https://cv2pf-jd-portfolio.vercel.app)
>
> 데모 영상: [Google Drive에서 보기](https://drive.google.com/drive/folders/16-eF-KIwCGqVP6CNIYkyBcJ_vK95ei9E?usp=sharing)

## 데모 핵심 흐름

1. 사용자가 QANDA Frontend Engineer 등 지원 기업·채용 공고를 고른다.
2. 개발자 CV 샘플을 넣고 Minimal Clean 디자인을 선택한다.
3. React가 `/api/generate`를 호출한다.
4. AI 요청이 성공하면 AI HTML을, 실패하면 CV에 있는 사실만 사용하는 로컬 렌더러 HTML을 보여준다.
5. 사용자가 현재 결과를 저장하면 배포 API가 Supabase `portfolios` 테이블에 저장한다.
6. 목록·상세 API가 UUID로 같은 HTML을 다시 읽어 화면에 표시한다.

이 흐름에서 AI 외부 서비스가 실패해도 화면 → API → Supabase 저장 → 새 요청 조회까지의
핵심 수직슬라이스는 끝까지 동작한다.

## 배포 문제와 해결

| 확인한 문제 | 첫 오류·원인 | 적용한 해결 |
| --- | --- | --- |
| Vite 정적 파일만 배포하면 `/api`가 없음 | 개발 환경의 Vite proxy는 운영 환경에 존재하지 않음 | React 정적 자산과 같은 도메인에서 `/api`를 처리하는 Sites Worker를 추가 |
| Vercel에서 React와 Express를 함께 제공해야 함 | 정적 Vite 출력만 지정하면 Express 라우트가 없음 | `api/index.mjs`에서 Express 앱을 export하고 `/api/:path*` rewrite와 SPA fallback 구성 |
| 로컬 `.env`가 최초 Vercel 함수 번들에 포함됨 | Git ignore만으로 Vercel 업로드 입력을 완전히 제한하지 못함 | `.vercelignore`에서 모든 실제 `.env*`를 제외하고 깨끗한 재배포 후 Vercel 암호화 환경 변수로만 등록 |
| 기존 AI 기본 모델명이 유효하지 않음 | `claude-sonnet-5` 기본값 | 서버와 배포 Worker 기본값을 `claude-sonnet-4-20250514`로 통일 |
| 배포 Worker 테스트가 CommonJS로 해석됨 | ESM `import`를 `.js` 테스트에서 실행 | 테스트 파일을 `.mjs`로 변경 |
| 배포 AI 생성 요청이 502 | Worker 로그의 Anthropic 응답: `authentication_error`, `invalid x-api-key` | 잘못된 키를 정상 키처럼 취급하지 않고 AI 미구성 상태로 전환하며, 화면의 기존 로컬 렌더러 fallback으로 데모 흐름 유지 |

유효한 Anthropic 키를 배포 환경에 넣으면 코드 변경 없이 AI 생성 경로를 다시 활성화할 수 있다.

## 배포 환경 확인 결과

| 검증 항목 | 결과 | 확인 근거 |
| --- | --- | --- |
| 서버·DB 구성 상태 | PASS | `/api/health` 200, DB 구성 확인 |
| 빈 생성 입력 | PASS | `POST /api/generate` 빈 JSON → 400, `cvMarkdown` 안내 |
| 잘못된 포트폴리오 ID | PASS | UUID가 아닌 ID → 400 |
| Supabase 저장 | PASS | `POST /api/portfolios` → 201 |
| 새 요청에서 목록 조회 | PASS | Vercel 저장 UUID `875b2973-25f8-4c4d-bdd5-a6b2fcb76ffd`가 목록에 존재 |
| 새 요청에서 상세 HTML 조회 | PASS | 같은 UUID의 이름·HTML·생성 시각 재조회 성공 |
| 서버 오류의 화면 표시 | PASS | AI 오류 시 결과 화면에 fallback 안내를 표시하고 결정적 렌더러 결과 제공 |
| 실제 브라우저 전체 흐름 | PASS | QANDA → 개발자 CV → Minimal Clean → fallback 생성 → 저장 성공 메시지·목록 갱신 |

저장과 상세 조회를 서로 다른 HTTP 요청으로 실행했기 때문에 브라우저 메모리가 아닌 Supabase
영속 데이터임을 확인했다. 서버 재시작이나 화면 새로고침 뒤에도 같은 UUID로 조회할 수 있다.

Vercel 기본 URL은 로그인 없이 접근 가능한 공개 배포다. 제출용 Showcase에는 이 실제 배포
URL과 실제 데모 영상 URL을 연결했다.

## Agent 활용 기록

### Agent에게 요청한 내용

- 로컬 Express 구조를 읽고 동일한 API 계약을 Sites Worker와 Vercel Function으로 옮기기
- 배포 빌드 산출물과 환경 변수 경계를 점검하기
- 빈 입력, 잘못된 UUID, DB 저장·조회, AI 실패 fallback을 검증하기
- 빌드 로그와 Worker 로그에서 첫 오류만 찾아 원인을 분리하기

### 검토하고 적용한 내용

- 브라우저에는 Supabase secret과 Anthropic key를 넣지 않고 서버·Vercel 환경 변수로만 전달했다.
- Vercel 업로드에는 `.env`를 포함하지 않고 `SUPABASE_SECRET_KEY`를 Sensitive Production 변수로 등록했다.
- API 계약을 바꾸지 않아 React 코드가 로컬과 배포에서 같은 상대 경로를 사용하게 했다.
- `is_favorite`가 없는 기존 DB 스키마에서도 핵심 저장·조회가 동작하는 호환 경로를 유지했다.
- AI 오류를 성공으로 가장하지 않고 화면에 제한을 알리면서 결정적 결과를 제공하도록 했다.

### 성공 판단 기준

- Client 17개, Server 14개, Worker 5개 테스트 통과
- lint와 production build 통과
- Sites 배포 상태 `succeeded`, Vercel production 상태 `READY`
- 배포 API의 400·200·201 응답 확인
- Supabase 저장 UUID를 새 목록·상세 요청으로 재조회

## 5분 영상 구성

| 시간 | 내용 |
| --- | --- |
| 0:00–0:35 | CV2PF가 해결하는 문제와 핵심 사용자 소개 |
| 0:35–1:30 | 기업·공고 선택 → CV 입력 → 디자인 선택 |
| 1:30–2:35 | 포트폴리오 생성 결과, fallback 안내, HTML 미리보기 |
| 2:35–3:25 | Supabase 저장 → 목록·상세 재조회 시연 |
| 3:25–4:15 | React → API → Supabase 데이터 흐름과 배포 구조 |
| 4:15–4:50 | 배포 오류 원인, Agent 요청·검토·적용 과정 |
| 4:50–5:00 | 완료 범위와 다음 개선 항목 정리 |
