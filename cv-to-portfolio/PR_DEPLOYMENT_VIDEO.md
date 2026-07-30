<!--
PR 제목: [N123_이규민] - 배포 환경 핵심 흐름과 데모 영상 제출
권장 라벨: feature, documentation
-->

## 주요 작업 리스트

- React 정적 화면과 Express `/api`를 한 도메인에서 제공하는 Vercel production 배포 구성
- `.vercelignore`로 로컬 `.env`를 제외하고 Supabase secret은 Sensitive Production 환경 변수로 분리
- 배포 환경 변수에 Supabase 연결 정보를 분리하고 서버 전용 secret 유지
- 배포 API에서 빈 입력·잘못된 UUID·저장·목록·상세 조회 검증
- Supabase에 저장한 UUID를 새 요청으로 다시 조회해 영속성 확인
- Anthropic 인증 실패를 Worker 로그로 진단하고 화면 fallback 동작 확인
- `showcase/showcase.json`에 실제 배포 URL과 데모 영상 URL 연결
- 오류, Agent 요청, 검토·적용 내용, 성공 기준을 작업 기록 문서로 정리

### 동작 화면

![기업·공고 선택](https://raw.githubusercontent.com/dolphin1404/NaverConnect_wm/codex/week3-job-targeted-portfolio/showcase/screenshots/target-selection.webp)

![생성 결과](https://raw.githubusercontent.com/dolphin1404/NaverConnect_wm/codex/week3-job-targeted-portfolio/showcase/screenshots/generated-result.webp)

### 확인 결과

- [x] Client tests 17개 통과
- [x] Server tests 14개 통과
- [x] Sites Worker tests 5개 통과
- [x] ESLint 통과
- [x] production build 통과
- [x] Sites production deployment 성공
- [x] Vercel production 공개 배포 성공
- [x] 빈 입력과 잘못된 UUID가 400으로 반환됨
- [x] Supabase 저장 201, 목록·상세 재조회 200
- [x] 새 HTTP 요청에서 같은 UUID와 HTML 재조회
- [x] 실제 Vercel 브라우저에서 QANDA → CV → 디자인 → fallback 생성 → 저장 성공
- [x] `showcase.json`에 배포 사이트와 데모 영상 URL 반영

## 내가 설명할 수 있는 부분

로컬에서는 Vite가 `/api` 요청을 Express로 넘기지만, 운영 정적 호스팅에는 이 proxy가 없습니다.
그래서 Sites에서는 Worker가, Vercel에서는 `api/index.mjs`가 정적 React 자산과 `/api` 라우트를
같은 도메인에서 처리하게 했습니다. React는 여전히 상대 경로 `/api`만 사용하므로 환경별 분기
코드가 필요하지 않습니다.

Supabase secret과 Anthropic key는 서버 환경 변수에만 있고 브라우저 번들에는 포함되지 않습니다.
저장 API는 snake_case DB 행을 camelCase 응답으로 바꾸며, 목록은 메타데이터만, 상세는 HTML까지
조회합니다. 이 구조로 화면 → 서버 → DB → 서버 → 화면의 한 바퀴를 설명할 수 있습니다.

## 아직 이해 못 한 부분

- 현재 제공된 Anthropic 키는 배포 로그에서 `invalid x-api-key`로 확인되어 실제 AI 생성은
  활성화하지 못했습니다. 유효한 키의 발급·권한·과금 정책은 추가 확인이 필요합니다.
- Vercel 공개 API에는 아직 사용자별 인증·인가가 없습니다. 현재는 데모용 공용 저장소이므로
  실제 사용자 서비스 전에는 로그인과 `user_id` 기반 접근 제어가 필요합니다.
- 원격 Supabase에 즐겨찾기 migration을 자동 적용하는 배포 파이프라인은 아직 없습니다.

## 새로 알게 된 것

- 개발 proxy가 해결하던 요청 경로는 production build에 포함되지 않으므로 운영 API 진입점을
  별도로 설계해야 합니다.
- 환경 변수가 존재한다는 사실만으로 외부 API가 정상이라는 뜻은 아닙니다. 실제 요청 로그의
  provider 오류를 확인해야 구성 완료 여부를 판단할 수 있습니다.
- 저장 성공 직후의 응답만 보는 것보다 새 목록·상세 요청에서 같은 UUID를 확인해야 DB
  영속성을 더 확실히 검증할 수 있습니다.
- fallback은 장애를 숨기는 용도가 아니라 제한을 화면에 알리고 핵심 사용자 흐름을 유지하는
  복구 경로로 설계해야 합니다.
