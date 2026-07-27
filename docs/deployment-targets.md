# Modu Brain 배포 대상

## 역할 분리

| 대상 | 역할 | 사용하지 않는 것 |
| --- | --- | --- |
| Vercel | 로그인 없는 공개 데모와 디자인 확인용 정적 SPA. 공개 import와 live health만 Render로 proxy | Supabase 비밀키, OpenAI 키, 프로젝트 저장 |
| Render | React SPA, Node API, Supabase 인증·저장이 함께 있는 정식 서비스 | 별도 프론트엔드 API 복제 |

Render가 데이터·인증·분석 API의 유일한 기준 주소다. Vercel은 공개 샘플 흐름만 확인하는 보조 배포로 유지한다.

## 배포 전 확인

1. `npm run build`가 통과한다.
2. Vercel은 `dist/client`를 정적 파일로 제공하고 SPA fallback을 사용한다.
3. Render의 `healthCheckPath`는 `/api/health/ready`다.
4. Render의 `/api/health/live` commit이 배포 대상 SHA와 일치한다.
5. Supabase redirect allowlist에는 정식 Render 로그인 주소만 유지한다.

## 공개 데모 원칙

- Vercel에서는 로그인·저장 프로젝트 진입을 수행하지 않는다.
- 공개 분석은 결정론적 로컬 분석을 사용한다.
- 서버 전용 키와 원문 저장은 Render에서만 처리한다.
