# 제품 백로그 안내

아맞다의 제품 백로그는 [GitHub 이슈](https://github.com/ppre1ude/hub/issues)에서 관리한다. 각 이슈에는 사용자가 얻게 될 결과, 작업 범위와 완료 기준을 기록한다.

[아맞다! 프로젝트](https://github.com/users/ppre1ude/projects/3)는 이슈의 상태, 우선순위, 실행 순서와 의존성을 보여준다. 현재 MVP에 포함되지 않은 기능도 검토가 필요하면 제품 결정 이슈로 등록하고 프로젝트의 백로그에서 관리한다.

제품 가설과 범위는 [현재 MVP](https://github.com/ppre1ude/hub/wiki/%ED%98%84%EC%9E%AC-MVP), 범위를 판단하는 기준은 [제품 원칙과 결정](https://github.com/ppre1ude/hub/wiki/%EC%A0%9C%ED%92%88-%EC%9B%90%EC%B9%99%EA%B3%BC-%EA%B2%B0%EC%A0%95)을 따른다.

일반 작업 상태는 GitHub에서 관리하며, 아래에는 범용 가져오기와 꺼내보기 의미 검색처럼 코드 반영과 운영 적용을 나눠 확인해야 하는 작업만 기록한다.

## #76 범용 가져오기 구현 범위

- [x] URL 붙여넣기와 Chrome bookmark HTML
- [x] CSV, JSON, HTML, Markdown, text, 안전한 ZIP
- [x] 분석 미리보기, 모음 매핑, commit, Undo, 기록 삭제
- [x] Notion Public Connection과 웹·Android 복귀
- [ ] YouTube, 카카오톡, Pinterest, Instagram 전용 어댑터

완료 근거와 운영 검증 절차는 [승인 설계](./superpowers/specs/2026-07-25-universal-insight-import-design.md)와 [구현 계획](./superpowers/plans/2026-07-25-universal-insight-import.md)에 둔다. 후속 서비스의 우선순위와 상태는 GitHub 이슈와 프로젝트에서 관리한다.

## #105 꺼내보기 의미 검색 구현 범위

- [x] Gemini 제목·메모 벡터 생성과 서버 인증 검색
- [x] 사용자별 768차원 벡터 저장, 관련도 기준과 비용 제한
- [x] 홈 꺼내보기를 서버 의미 검색 결과로 연결
- [x] 기존 인사이트 Batch 변환 제출·반영 도구
- [ ] Supabase 마이그레이션과 Vercel 서버 환경 변수 적용
- [ ] 담당자 승인 뒤 기존 인사이트 Batch 변환
- [ ] 운영 환경에서 대표 상황 검색과 사용자 격리 확인

구현 계약과 운영 순서는 [검색과 꺼내보기 구현 계약](./retrieve.md)과 [운영 배포](./deployment.md)를 따른다. 카테고리 입력과 필터 연결은 [#71](https://github.com/ppre1ude/hub/issues/71)에서 별도로 관리한다.
