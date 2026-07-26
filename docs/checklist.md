# 실행 계획 안내

현재 작업 상태, 우선순위, 주차와 의존성은 [아맞다! 프로젝트](https://github.com/users/ppre1ude/projects/3)에서 관리한다. 작업별 범위와 완료 기준은 연결된 [GitHub 이슈](https://github.com/ppre1ude/hub/issues)를 따른다.

실행할 작업을 고를 때 다음 순서로 확인한다.

1. 프로젝트에서 `시작 가능` 상태와 선행 이슈를 확인한다.
2. 이슈에서 사용자 결과, 포함 범위와 완료 기준을 확인한다.
3. 코드와 함께 바뀌는 계약은 `CONTEXT.md`, `DESIGN.md`와 `docs/`의 구현 문서에서 확인한다.
4. 구현과 검증 결과를 이슈에 남기고 프로젝트 상태를 갱신한다.

일반 실행 상태는 GitHub에서 관리하며, 아래에는 #24 구현과 외부 운영 확인의 경계만 기록한다.

## #24 구현 체크

- [x] 범용 후보·분석·commit·Undo 데이터 계약
- [x] 브라우저 파일 파싱과 원본 비업로드 경계
- [x] Notion 단일 사용 state, 암호화 token, 재개 cursor, revoke·24시간 cleanup
- [x] 웹 callback query와 Android `import/notion` 딥링크
- [ ] Preview 승인 계정 수동 검증과 운영 Sensitive 변수·Firewall·Cron 확인
- [ ] YouTube, 카카오톡, Pinterest, Instagram 후속 범위 결정

로컬 자동 검증 명령과 Preview 수동 항목은 [운영 배포](./deployment.md)를 따른다.
