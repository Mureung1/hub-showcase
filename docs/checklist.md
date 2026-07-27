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
- [ ] Vercel 가입 + 포크 저장소 연결 확인 (본인 작업)
- [ ] Render 가입 + 포크 저장소 연결 확인 (본인 작업)

## 실제 배포 (화)
- [ ] React → Vercel 배포
- [ ] Express → Render 배포 (배포 환경이 제공하는 포트 사용)
- [ ] 배포 환경 환경변수 설정 (Supabase, Groq 키)
- [ ] FE가 배포된 BE 주소를 환경변수로 읽도록 수정

## 배포 검증 (화)
- [ ] FE 주소 외부에서 열리는지 확인
- [ ] BE `/api/health` 응답 확인
- [ ] 배포 환경에서 실제 채팅 1회 성공 (화면→서버→DB)
- [ ] 실패 시 로그 읽고 원인 기록

## 영상 제출 (수, 밤 10시까지)
- [ ] 5분 미만 데모 영상 제작 (서비스 설명 + 시연 + 기술 특징 + Agent 활용)
- [ ] 음성 또는 자막 포함
- [ ] YouTube(비공개 가능) 또는 Drive 등 URL 확보
- [ ] `showcase.json`에 `demoVideoUrl` 추가
- [ ] PR에 포함

## 데모 준비 (목~금)
- [ ] 서비스 소개·시연 순서 정리
- [ ] Agent·Skill·규칙 문서 관계를 그림으로 정리
- [ ] 배포 주소·핵심 기능 데모 전 재확인
- [ ] 워크플로우 문서 최종화 (캠프 이후에도 재사용 가능한 형태로)
