# WEB-015 API Error and Demo Policy Run Report

## 결과

- 상태: local implementation verified, public smoke pending
- production 기본 경로의 자동 snapshot fallback을 제거했다.
- `VITE_DEMO_MODE=true`일 때만 검증 snapshot을 읽고 source를 `demo`로 표시한다.
- API 실패 시 RNB 분석값을 숨기고 error와 retry를 표시한다.

## 자동 검증

```text
web test: 20 files, 57 tests passed
targeted regression: 3 files, 17 tests passed
TypeScript typecheck: passed
Oxlint: passed
production build: passed
changed-file Prettier check: passed
```

전체 `format:check`는 이번 변경과 무관한 기존 9개 source 파일과 한 manifest의 format debt 때문에
통과하지 않는다. 이번에 변경한 파일은 별도로 Prettier 검사를 통과했다.

## 브라우저 검증

API base를 연결 불가능한 local endpoint로 지정하고 Playwright snapshot을 확인했다.

```text
상단: 상권 분석 API에 연결하지 못했습니다. 예시 값으로 대체하지 않았습니다.
RNB: 상권 분석 데이터를 불러오지 못했습니다.
retry: 상단과 RNB에 다시 시도 버튼 표시
hidden: 입지 점수, 시간대 그래프, 분석 요약
nearby: 주변 점포 API 오류를 별도 상태로 표시
```

## 남은 Gate

- latest `develop` Vercel Web 배포
- Render `/ready`와 canonical query 정상화
- 공개 검색·분석·반경 조회 및 retry smoke
- smoke 통과 뒤 GitHub #51과 #23 상태 갱신
