# TDD 검증 리포트 - 미션 진행 상태

## 선택한 작은 기능

미션 상세 체크리스트에서 모든 항목을 완료하면 진행 상태를 `completed`로 계산한다.

## Red

먼저 `backend/src/services/missionProgressService.test.js`를 작성했다.

테스트한 동작:

- 진행 입력값의 공백 제거, 빈 값 제거, 중복 제거
- 체크 항목 없음: `pending`
- 일부 체크: `in_progress`
- 전체 체크: `completed`
- 이미 제출됨: `submitted` 유지

첫 실행 결과:

```txt
SyntaxError: The requested module './missionProgressService.js' does not provide an export named 'calculateMissionStatus'
```

## Green

`backend/src/services/missionProgressService.js`에 다음 helper를 추가했다.

- `normalizeProgressInput`
- `calculateMissionStatus`

프론트 저장 요청에는 전체 체크리스트인 `checklistItems`를 함께 보내도록 변경했다.

관련 파일:

- `backend/src/services/missionProgressService.js`
- `backend/src/services/missionProgressService.test.js`
- `frontend/src/features/career/missionProgressApi.js`
- `frontend/src/pages/MissionDetail.jsx`
- `docs/api-spec.md`

## 검증 명령

```bash
npm.cmd --prefix backend test
npm.cmd --prefix backend run db:generate
cmd.exe /c "set RUN_INTEGRATION_TESTS=1&& npm.cmd --prefix backend run test:integration"
npm.cmd --prefix backend exec prisma validate -- --schema backend\prisma\schema.prisma
npm run build
npm.cmd run lint
node --check backend\src\routes\missionRoutes.js
node --check backend\src\services\missionProgressService.js
```

결과: 모두 통과.

## API 통합 테스트

`backend/src/routes/missionRoutes.integration.test.js`를 추가했다.

검증 범위:

- Express app 생성
- 임시 사용자 생성
- JWT 생성
- `PATCH /api/missions/:missionId/progress` 호출
- `GET /api/missions/:missionId/progress` 호출
- `UserMission.checkedItems`와 `completed` 상태 확인
- 테스트 종료 후 임시 사용자와 미션 삭제

첫 실행에서는 로컬 Prisma Client가 새 `checkedItems` 필드를 아직 알지 못해 500 응답이 발생했다.

```txt
Unknown argument `checkedItems`
```

`npm.cmd --prefix backend run db:generate`로 Prisma Client를 재생성한 뒤 통합 테스트가 통과했다.

## Skill / Agent 검증

반복 검증 절차를 `.codex/skills/career-mission-tdd-validator` Skill로 만들었다.

`quick_validate.py`는 실행했지만 현재 Python 환경에 `PyYAML`이 없어 아래 오류로 중단됐다.

```txt
ModuleNotFoundError: No module named 'yaml'
```

Skill 파일 구조와 frontmatter는 수동 확인했다.

## 남은 리스크

- 백엔드 route 전체를 실제 HTTP 요청으로 검증하는 integration test는 아직 없다.
- Supabase DB는 migration history drift가 남아 있어, 운영 데이터 삭제 없이 별도 정리해야 한다.
