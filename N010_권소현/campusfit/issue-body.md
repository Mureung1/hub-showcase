## 월요일 — 기획/문서 정리
- [ ] 데모 피드백 반영해서 기획서 수정
- [ ] CLAUDE.md/skill.md 실제 상태에 맞게 정리
- [ ] 프로토타입 새 기획에 맞게 재구현
- [ ] 개인 GitHub 저장소(campusfit) 생성 및 업로드
- [ ] 기획서 발표용 시각자료 제작

**완료 기준**: 위 5개가 campusfit 저장소에 다 반영되어 있다

## 화요일 — 필터링 핵심 기능
- [ ] 필터 버튼 선택 상태 표시
- [ ] mock 공고 데이터 코드로 이관
- [ ] 선택한 필터로 목록 걸러지기

**완료 기준**: 필터를 "국립대"로 선택하면 사립대 항목이 화면에서 사라진다

## 수요일 — 화면 조립
- [ ] 메인 화면 요약 숫자 표시
- [ ] 마감임박 통합 목록
- [ ] 카테고리 클릭 → 화면 이동
- [ ] 팀원모집 게시판 목록 화면

**완료 기준**: 카테고리 클릭 시 실제로 다른 화면으로 이동하고, "팀원모집 N건" 클릭 시 그 공고 글 목록만 보인다

## 목요일 — 서버 + DB 시작
- [ ] Express가 필터 조건(쿼리 파라미터) 받아서 걸러주기
- [x] Supabase 프로젝트 + listings 테이블 생성

**완료 기준**: Supabase 프로젝트 생성, SQL Editor로 categories/listings/board_posts/comments
테이블 생성 완료, Supabase 대시보드에서 테이블이 보인다
(참고: 완료 기준에 있던 `univType`(국립/사립) 필터 예시는 삭제 — 이후 국립/사립 필터 자체를
빼기로 결정해서 더 이상 유효하지 않음)

## 금요일 — 연결 + 점검
- [x] 서버가 Supabase에서 데이터 가져오게 연결
- [ ] 전체 흐름 점검

**완료 기준**: `listings`/`board_posts` 라우트가 better-sqlite3 대신 Supabase 쿼리로 데이터를
가져온다, mock 데이터를 `npm run db:seed`로 Supabase에 이전, 새로고침·서버 재시작해도
화면 데이터가 유지된다 (수직슬라이스 완성은 아직 — categoryId 필터만 있고 필터 변경에 따른
동적 목록 갱신은 미확인)

## 공부 (매일, notes/ 폴더에 커밋)
- [ ] 월: Main.jsx 코드 읽기 + 사전지식 복습(CLAUDE.md·skill·Plan mode·Agent·FE-BE-DB 흐름) -> notes/월-복습.md
- [ ] 화: state, 배열 필터링 -> notes/화-state-filter.md
- [ ] 수: 라우팅(react-router-dom) -> notes/수-routing.md
- [ ] 목: 쿼리 파라미터, 데이터베이스 기초 -> notes/목-query-db.md
- [ ] 금: 비동기 처리(async/await) + 전체 사이클 정리 -> notes/금-async.md

**완료 기준**: 각 요일 파일이 campusfit 저장소에 커밋되어 있다
