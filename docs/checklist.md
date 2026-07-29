# 작업 분해 — TideNote (4주차: 배포 + 핵심 기능 완성)

[TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C)의 핵심 기능을 이번 주 목표에 맞춰 작업 단위로 쪼갠 목록.
3주차 작업 분해는 git 이력 참고 (`docs/backlog.md` 0번 항목에 요약).

## 실제 채팅 (오늘 완료)
- [x] `messages` 테이블 생성 (role, content, valence, arousal, created_at)
- [x] Groq(Llama 3.3) API 연동, 한국어 강제 시스템 프롬프트
- [x] `POST /api/messages` — 메시지 저장 + AI 응답 저장
- [x] `GET /api/messages` — 저장 시점 상태(D_gen) vs 현재 상태(D_recall) 비교해 잠김 판정
- [x] `ChatView.jsx` 실제 API 연동, 잠긴 메시지는 블러 + View original
- [x] 데모용 잠긴 메시지 시드, curl + 브라우저로 검증

## 배포 준비 (오늘)
- [x] `npm run build` 로컬 성공 확인
- [x] FE/BE 폴더 구조 확인 (같은 package.json 공유 — 기준 폴더 별도 설정 불필요)
- [x] 필요한 환경변수 목록: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, `PORT`
- [x] `.env`가 git에 안 올라간 것 확인
- [x] Vercel 가입 + 포크 저장소 연결 확인
- [x] Render 가입 + 포크 저장소 연결 확인

## 실제 배포 (화)
- [x] Express → Render 배포 (배포 환경이 제공하는 포트 사용) → https://tidenote-api.onrender.com
- [x] React → Vercel 배포 → https://hub-murex-mu.vercel.app
- [x] 배포 환경 환경변수 설정 (Supabase, Groq 키, `FRONTEND_URL` CORS 제한)
- [x] FE가 배포된 BE 주소를 환경변수(`VITE_API_BASE_URL`)로 읽도록 수정 — 어제 미리 준비해둔 `src/apiBase.js` 그대로 사용

## 배포 검증 (화)
- [x] FE 주소 외부에서 열리는지 확인
- [x] BE `/api/health` 응답 확인
- [x] 배포 환경에서 실제 채팅 1회 성공 (화면→Render→Supabase 저장·조회, Groq 응답까지)
- [x] 막힌 지점 기록 — Render/Vercel이 처음에 원본(업스트림) 저장소에 연결돼서 `work` 브랜치가 안 보였음. 계정 전환으로 fork(`snael0510-coder/hub`)를 선택해서 해결. Vercel도 처음 배포는 `main`(오래된 브랜치)으로 잡혀서 실패 → Production Branch를 `work`로 변경 후 재배포로 해결

## 영상 제출 (수, 밤 10시까지)
- [ ] 5분 미만 데모 영상 제작 (서비스 설명 + 시연 + 기술 특징 + Agent 활용)
- [ ] 음성 또는 자막 포함
- [ ] YouTube(비공개 가능) 또는 Drive 등 URL 확보
- [ ] `showcase.json`에 `demoVideoUrl` 추가
- [ ] PR에 포함

## 기능 보완 (수)
- [x] 배포 재확인 (Render `/api/health`, Vercel FE 둘 다 정상)
- [x] Episodes 사이드바를 실제 `messages` 데이터에 연결 (TDD로 `groupMessagesIntoEpisodes` 구현)
- [x] 로컬 + 배포 환경 양쪽에서 확인
- [x] 작업 과정(오류·요청·검토·성공 확인) 기록 → [docs/work-log.md](work-log.md)

## 데모 준비 (목~금)
- [ ] 서비스 소개·시연 순서 정리
- [ ] Agent·Skill·규칙 문서 관계를 그림으로 정리
- [ ] 배포 주소·핵심 기능 데모 전 재확인
- [ ] 워크플로우 문서 최종화 (캠프 이후에도 재사용 가능한 형태로)
