# Noa AI

Noa AI는 사용자가 현재 상황을 이야기하고 선택적으로 카메라 기반 얼굴 움직임
신호를 참고해 대화를 이어가는 웹서비스입니다. 감정 결과는 가능성과 참고값으로만
표시하며 의료적·심리적 진단을 제공하지 않습니다.

- 프로덕션 웹: https://hub-five-topaz.vercel.app
- 프로덕션 API: https://relationship-ai-api.onrender.com
- 기준 브랜치: `relationship-ai-restored`

## 현재 사용자 흐름

화면은 세 상태가 순서대로 전환됩니다.

```text
익명·게스트 시작
→ 대화와 선택적 카메라 분석
→ 감정 신호 참고값과 회전 지구본
→ 다시 대화하거나 처음으로 이동
```

### 익명 모드

- 현재 탭의 `sessionStorage`만 사용합니다.
- 브라우저 탭을 닫으면 익명 기록이 사라집니다.
- Render, Supabase, Gemini를 호출하지 않습니다.
- 규칙 기반 감정 분석과 로컬 대체 답변을 사용합니다.

### 게스트 모드

- 서버가 만든 무작위 복구 키로 시작합니다.
- 복구 키 원문은 서버와 DB에 저장하지 않고 HMAC-SHA256 해시만 저장합니다.
- 활성 키는 현재 탭의 `sessionStorage`에만 보관합니다.
- 키로 인증된 `guest_session_id`의 기록만 저장하고 복원합니다.
- 기본 보관 기간은 30일입니다.
- 게스트에서 나가면 현재 탭의 키만 제거되고 서버 기록은 유지됩니다.

## AI와 감정 분석

감정 점수는 브라우저의 규칙 기반 분석으로 계산합니다. 게스트 대화에서는 사용자가
전송 버튼을 누른 순간에만 Render가 Gemini 2.5 Flash-Lite를 호출합니다.

```text
게스트 인증
→ 입력과 최근 대화 최대 6개 검증
→ 위기 표현은 서버의 고정 안전 응답
→ Gemini 단일 요청
→ 생성 답변과 감정 분석 기록 저장
```

- AI 호출 타임아웃은 8초입니다.
- 생성 요청은 기본적으로 IP별 15분당 10회로 제한합니다.
- Gemini 장애나 타임아웃은 규칙 기반 로컬 답변으로 복구합니다.
- 무료 토큰 또는 요청 한도에 도달하면 `Noa는 자고 있어요.`를 표시합니다.
- 백그라운드 호출, 폴링, WebSocket, SSE와 keep-alive 요청은 없습니다.

무료 Gemini 등급은 전송된 내용을 제공자의 제품 개선에 사용할 수 있습니다. 이
사실은 게스트 입력 화면에도 안내합니다.

## 카메라와 개인정보

카메라는 사용자가 `카메라 시작`을 눌렀을 때만 실행됩니다.

```text
카메라 영상
→ 브라우저 내부 MediaPipe Face Landmarker
→ 허용된 blendshape 특징
→ 최근 결과 안정화
→ 얼굴 움직임 참고 신호
```

서버로 전송하지 않는 항목:

- 영상, 사진, 프레임
- 얼굴 랜드마크 좌표
- 전체 blendshape 점수
- 카메라 장치 식별 정보

게스트 기록에 저장할 수 있는 항목:

- `manual` 또는 `camera` 출처
- 0~1 범위의 안정화된 표현 신호 유사도
- 허용된 특징 이름 최대 3개
- 휴리스틱 버전

카메라 화면을 종료하거나 다른 화면으로 이동하면 MediaStream 트랙과 분석
런타임을 정리합니다.

## 결과 지구본

결과 화면은 COBE WebGL 지구본으로 상위 감정 신호 세 개를 표현합니다.

- 평소에는 천천히 자동 회전합니다.
- 분석 중에는 조금 빠르게 회전합니다.
- 마우스와 터치 드래그로 직접 회전할 수 있습니다.
- `prefers-reduced-motion`에서는 자동 회전을 멈춥니다.
- 화면을 떠날 때 애니메이션, ResizeObserver와 WebGL 인스턴스를 정리합니다.
- WebGL 초기화 실패 시 CSS 구체를 표시합니다.

지구본은 시각적 보조 수단입니다. 같은 결과를 텍스트와 progressbar로도 제공합니다.

## 배포 구조

```text
React/Vite · Vercel
  └─ same-origin /api rewrite
       └─ Express · Render Free
            ├─ Supabase Free
            └─ Gemini Developer API Free
```

Vercel은 `/api/:path*`를 Render로 먼저 전달하고 나머지 경로를 SPA
`index.html`로 처리합니다. 브라우저에는 Supabase나 Gemini 비밀키를 제공하지
않습니다.

## 기술 스택

- Frontend: React 18, Vite 8
- Backend: Express 5
- Database: Supabase
- Generative AI: Gemini Developer API
- Camera analysis: MediaPipe Face Landmarker
- Globe: COBE 2
- Tests: Vitest, Testing Library
- Deployment: Vercel, Render

## 로컬 실행

```bash
npm install
npm run dev
```

프런트엔드 기본 주소는 `http://127.0.0.1:5173`입니다.

백엔드를 별도 실행하려면:

```bash
npm run server
```

Vite 개발 서버에서 로컬 Express를 직접 호출하려면
`VITE_API_BASE_URL=http://127.0.0.1:3000`을 사용할 수 있습니다. 프로덕션은
same-origin `/api` rewrite를 사용하므로 이 값이 필요하지 않습니다.

## 서버 환경변수

비밀값은 Render 또는 로컬 `.env`에만 저장하고 Git에 커밋하지 않습니다.

| 환경변수 | 기본값 | 용도 |
| --- | --- | --- |
| `SUPABASE_URL` | 없음 | Supabase 프로젝트 URL |
| `SUPABASE_SECRET_KEY` | 없음 | 서버 전용 Supabase secret |
| `SUPABASE_SERVICE_ROLE_KEY` | 없음 | 이전 service-role 키 대체 입력 |
| `GUEST_KEY_PEPPER` | 없음 | 게스트 키 HMAC용 32자 이상 비밀값 |
| `GEMINI_API_KEY` | 없음 | 서버 전용 Gemini 키 |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | 생성 모델 |
| `CLIENT_URL` | 로컬 origin | 허용할 Vercel origin |
| `PORT` | `3000` | Express 포트 |
| `API_RATE_LIMIT_WINDOW_MS` | `900000` | 요청 제한 시간 |
| `API_RATE_LIMIT_MAX` | `100` | 전체 API 요청 제한 |
| `AI_RATE_LIMIT_MAX` | `10` | AI 생성 요청 제한 |
| `JSON_BODY_LIMIT` | `100kb` | JSON 본문 제한 |
| `TRUST_PROXY_HOPS` | 프로덕션 `1` | Render 프록시 홉 |

`/health`는 Supabase와 게스트 세션 필수 설정이 준비됐는지 확인합니다. Gemini
미설정은 서버 전체 장애로 취급하지 않으며 프런트가 로컬 답변으로 복구합니다.

## API

| Method | Route | 인증 | 역할 |
| --- | --- | --- | --- |
| `GET` | `/health` | 없음 | 서버 준비 상태 |
| `POST` | `/api/guest-sessions` | 없음 | 게스트 키 생성 |
| `POST` | `/api/guest-sessions/recover` | `X-Guest-Key` | 키 복구 |
| `DELETE` | `/api/guest-sessions/current` | `X-Guest-Key` | 서버 게스트 기록 삭제 |
| `GET` | `/api/emotion-analyses?limit=20` | `X-Guest-Key` | 게스트 기록 조회 |
| `POST` | `/api/emotion-analyses` | `X-Guest-Key` | 게스트 분석 저장 |
| `POST` | `/api/ai-chat/responses` | `X-Guest-Key` | 온디맨드 AI 답변 |

브라우저에서 만든 `sessionId`는 익명 탭 내부 식별과 UI 메시지 ID에만 사용하며
서버 데이터 소유권 근거가 아닙니다.

## 데이터베이스

초기 스키마와 마이그레이션을 다음 순서로 적용합니다.

1. `backend/supabase-schema.sql`
2. `backend/migrations/20260724_add_face_signal_metadata.sql`
3. `backend/migrations/20260724_make_camera_face_signal_optional.sql`
4. `backend/migrations/20260729_add_guest_sessions.sql`

주요 테이블:

- `guest_sessions`: 복구 키 해시, 생성·접근·만료 시각
- `emotion_analyses`: 게스트별 입력, 요약 신호, 분석 결과와 AI 답변
- `conversation_messages`: 향후 독립 메시지 저장을 위한 테이블이며 현재 화면 복원은
  `emotion_analyses` 레코드를 사용

모든 테이블은 RLS를 활성화하고 브라우저 역할의 직접 접근을 막습니다.

## 테스트

```bash
npm run test:run
npm run test:e2e
npm run test:analysis
npm run build
```

실제 외부 서비스가 필요한 검증:

```bash
npm run test:supabase
npm run test:api
```

`test:api`는 실제 Supabase에 검증 레코드를 만들 수 있으므로 의도한 환경에서만
실행합니다.

2026-07-29 기준 최근 검증:

- Vitest: 38개 파일, 112개 테스트 통과
- Vite 프로덕션 빌드 통과
- Vercel 프로덕션 HTTP 200
- Vercel `/api/ai-chat/responses`가 Render 최신 라우트로 전달됨
- Render `/health` HTTP 200

## 현재 제한

- 감정 점수는 규칙 기반 참고값이며 학습된 감정 진단 모델이 아닙니다.
- 음성은 실제 녹음·분석이 아니라 사용자가 어조 신호를 선택합니다.
- 회원 계정 로그인은 없으며 게스트 복구 키가 저장 기록의 접근 수단입니다.
- 무료 Render는 첫 요청에 콜드 스타트 지연이 생길 수 있습니다.
- 무료 Gemini 할당량과 데이터 사용 정책은 제공자 정책의 영향을 받습니다.
- 서버 기록 삭제 API는 있으나 현재 UI에는 별도 삭제 확인 화면이 없습니다.
- `showcase/screenshots` 이미지는 현재 순차 화면 UI로 다시 촬영해야 합니다.

## 관련 문서

- [배포 체크리스트](docs/deployment-checklist.md)
- [감정 분석 API](docs/emotion-analysis-api.md)
- [생성형 AI 설정](docs/generative-ai-setup.md)
- [Supabase 설정](docs/supabase-setup.md)
- [테스트 계획](docs/test-plan.md)
- [프로젝트 기획 이력](docs/project-history.md)

