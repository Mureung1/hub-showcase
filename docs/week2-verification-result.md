# 2주차 기능 검증 결과

검증일: 2026-07-13

## 통과

- [x] React 화면에서 감정 텍스트를 입력할 수 있다.
- [x] 빈 입력이면 정리하기 버튼이 비활성화된다.
- [x] 정리하기를 누르면 Express 미리보기 API에 요청한다.
- [x] 서버가 `emotion`, `cause`, `action` mock 결과를 만든다.
- [x] 결과 카드 3개가 화면에 표시된다.
- [x] 결과 카드 내용을 수정할 수 있다.
- [x] 서버 에러 응답이 `{ error: { message } }` 형식이다.
- [x] Supabase 환경변수가 없을 때 503 오류를 화면에 표시한다.
- [x] React 프로덕션 빌드가 통과한다.
- [x] mock summary 단위 테스트가 통과한다.
- [x] LiteLLM을 통해 Vertex Gemini의 실제 결과를 표시한다.
- [x] 실제 AI 결과와 mock 결과의 출처를 화면에 구분해 표시한다.
- [x] LiteLLM을 중단하면 mock fallback으로 화면 흐름을 유지한다.
- [x] AI 응답이 JSON 형식을 지키지 않으면 1회 재시도한 뒤 fallback한다.

## 실제 Supabase 통합 검증

- [x] 수정한 결과가 Supabase `checkins` 테이블에 저장된다.
- [x] 저장 직후 최신 기록이 화면 목록의 맨 위에 표시된다.
- [x] 새로고침 후에도 Supabase 기록을 다시 조회한다.
- [x] 한글 원문과 수정한 결과가 깨지지 않고 저장·조회된다.

검증 기록 원문은 `[통합검증]`으로 시작하며, 감정 값을 `낯섦과 성취감`으로 수정해 저장했다. 저장 완료 안내, 최신 목록 반영, 브라우저 새로고침 후 재조회까지 통과했다.

## 검증한 API

- `GET /api/health` → 200, `{ "status": "ok" }`
- `POST /api/checkins/preview` → 200, mock 결과 3개 반환
- Supabase 환경변수 없는 `GET /api/checkins` → 503, 통일된 오류 응답 반환
- LiteLLM 실행 중 `POST /api/checkins/preview` → 200, `source: "ai"`
- LiteLLM 중단 후 `POST /api/checkins/preview` → 200, `source: "mock"`
