# 2026-07-27 데모·첫 배포 준비 기록

## 데모에서 보여 줄 핵심 흐름

1. 방장 **민지**로 로그인한다.
2. 사진(1~5장), 대표 사진, 상품 URL, 지도 픽업 위치, 상세 주소, 계좌번호를 넣어 공동구매 글을 등록한다.
3. 홈과 게시글 모음에서 방금 등록한 글의 대표 사진과 DB 정보를 확인한다.
4. 참여자 **서준**으로 로그인해 마지막 자리에 참여한다. 방장도 인원에 포함되므로 최소 목표 인원은 2명이다.
5. 모집 완료 안내에서 방장 계좌번호와 1인 금액을 확인하고, 참여자가 입금 완료를 신고한다.
6. 방장이 참여자의 입금을 확인한 뒤 주문 완료 상태로 바꾼다.

## 오늘 확인한 결과

- 프론트엔드는 `Project/frontend`, 백엔드는 `Project/backend`에 분리돼 있다.
- `GET /health`가 정상 응답한다.
- 백엔드 Jest 테스트 19개와 프론트엔드 production build가 통과했다.
- 홈 카드와 상세 화면은 고정 목업 대신 API가 돌려준 제목, 사진, 방장, 상세 설명, 픽업 정보, 계좌 정보를 사용한다.
- 등록 화면에서 지도 선택 모달의 내부 스크롤을 지원해 작은 화면에서도 `이 위치로 저장` 버튼을 누를 수 있다.
- 사진은 최대 5장이고 첫 번째 사진이 대표 사진이다. 각 사진을 1MB 이하로 제한하고 서버 요청 한도를 8MB로 맞췄다.

## 배포 전에 결정·입력할 항목

### 프론트엔드(Vercel)

- 기준 폴더: `Project/frontend`
- 빌드 명령: `npm run build`
- 환경 변수: `VITE_API_BASE_URL`, `VITE_KAKAO_MAP_APP_KEY`

### 백엔드(Render)

- 기준 폴더: `Project/backend`
- 시작 명령: `npm start`
- Render가 제공하는 `PORT`를 그대로 사용한다.
- 환경 변수: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ORIGINS`
- 선택 환경 변수: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

## 아직 남은 배포 전제와 다음 순서

1. **P0: 외부에서 접근 가능한 MySQL을 준비한다.** 로컬 Docker MySQL은 Render에서 접근할 수 없다.
2. MySQL 접속값을 Render 환경 변수에 넣고 `/health`와 DB 조회 API를 확인한다.
3. Render 주소를 `VITE_API_BASE_URL`로 넣어 Vercel을 배포한다.
4. Vercel 주소를 백엔드 `CORS_ORIGINS`에 추가하고, 배포 화면에서 등록 → 참여 → 입금 → 주문 완료를 다시 시연한다.
5. 실제 메일 시연이 필요하면 SMTP 값을 넣는다. 값이 없을 때도 앱 알림 기록은 DB에 남는다.

## 보안 확인

- 실제 `.env` 파일은 Git 추적 대상이 아니며, 저장소에는 `.env.example`만 둔다.
- 데모용 간편 로그인은 데모 환경에서만 `ENABLE_DEV_LOGIN=true`로 켠다.
