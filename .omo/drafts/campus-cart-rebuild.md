# Draft: CampusCart Function-First Rebuild

## Requirements (confirmed)
- 기존 화면을 기능 중심으로 전면 재구성한다.
- 공동구매와 수령 장소는 별도 URL을 사용한다.
- Express API의 한 테이블 CRUD 수직 슬라이스를 발표에서 시연한다.
- Git 커밋과 푸시는 하지 않는다.

## Technical Decisions
- `/group-buys`를 기본 작업 화면으로 사용한다.
- 홍보용 히어로, 가짜 통계, 카트, 중복 AI 추천을 제거한다.
- API GET/POST/PATCH/DELETE와 화면 상태를 연결한다.
- Supabase 환경변수가 없을 때는 로컬 메모리 저장소를 명시적으로 표시한다.
- `/pickup`에서 장소를 선택하면 공동구매 생성 폼으로 전달한다.

## Scope Boundaries
- INCLUDE: 목록, 검색, 생성, 수정, 삭제, 장소 선택, API 검증 상태.
- EXCLUDE: 로그인, 결제, 실제 AI 추천, Git 배포.
