## 1주차 - 기획 & 기본 저장 플로우
- [x] 프로젝트 세팅 (Next.js + Tailwind + PWA)
- [x] 홈 화면 헤더 (로고, 프로필 아이콘)
- [x] 저장 입력 카드 컴포넌트 (텍스트 붙여넣기 + 이미지 첨부 버튼)
- [x] 저장 버튼 (로딩 상태 포함)
- [x] 최근 저장 리스트 (카드형, 카테고리 뱃지)
- [x] 하단 네비게이션 (홈/카테고리/아카이브/설정)
- [x] 기획서(plan.md) / 작업 체크리스트(checklist.md) 작성
- [x] Supabase 프로젝트 연결 코드 및 URL/키 환경변수 구성
- [x] items 테이블 및 Storage migration 작성
- [x] 저장 버튼 → Express → Supabase insert 연결

## 2주차 - 자동 분류 & 카테고리 뷰
- [x] 도메인 기반 분류 규칙 설계
- [x] 키워드 기반 분류 규칙
- [x] 저장 시 Gemini + 규칙 fallback 자동 분류 연결
- [x] 카테고리 트리 뷰 페이지 (대분류 > 소분류, 카운트 표시)
- [x] 카테고리별 필터링된 카드 리스트
- [x] 카드 클릭 → 원본 링크로 이동

## 3주차 - 완료 처리 & 리마인더 & 이미지
- [x] 버튼 완료 처리 → 아카이브 이동
- [x] 아카이브 페이지
- [ ] Firebase Cloud Messaging 설정 (푸시 알림)
- [ ] 저장 후 N일 경과 시 리마인더 알림 로직
- [x] 이미지 업로드 → Supabase Storage 및 Gemini Vision 연동
- [x] 이미지 기반 자동 분류

## 4주차 - 마무리 & iOS 실사용 & 발표 준비
- [x] 제목·요약·원문·카테고리 통합 검색
- [ ] Apple 단축어(Shortcuts) 제작 - 공유 시트 → API POST
- [x] PWA 아이콘/manifest 확정
- [ ] Vercel Frontend 및 Render Backend production 배포
- [ ] 배포 전체 플로우 QA (저장 → 분류 → 확인 → 완료 처리)
- [ ] 버그 수정 및 UI 다듬기
- [x] 데모 시나리오 및 Agent 관계도 문서 작성
- [x] README 개발·배포 문서 링크 정리
- [ ] 5분 미만 영상 업로드 및 showcase `demoVideoUrl` 추가
