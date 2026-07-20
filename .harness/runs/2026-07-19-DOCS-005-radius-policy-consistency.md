# Run Report: DOCS-005 반경 정책 정합성

## 1. 현재 contract

| 경계 | 결과 |
| --- | --- |
| Web 선택지 | 100m, 300m, 500m |
| URL parser | 위 세 값만 허용 |
| 오래된 `radius=1000` | 기본 300m로 복구 |
| Nearby API | 위 세 값만 허용, 그 외 HTTP 422 |

## 2. 문서 처리

- backlog의 현재 지원 범위에서 1km를 제거했다.
- 2026-07-16 ANALYSIS-002 보고서의 1km 수치는 삭제하지 않고 제거 전 성능 실험임을 표시했다.
- 500m 초과 분석은 현재 제품 기능이 아니라 별도 성능·공간 분석 범위로 유지한다.

## 3. 검증

- URL state test에 `radius=1000 -> 300` 회귀가 존재한다.
- production API의 1km 요청은 HTTP 422와 허용 반경 안내를 반환했다.
- 공개 Vercel DOM에서 100m·300m·500m 버튼만 확인했다.
- Task Packet 검사는 commit 전 다시 실행한다.
