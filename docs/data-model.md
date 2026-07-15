# 데이터 모델 설계

## subjects 테이블

사용자가 등록한 시험 과목 정보를 저장한다.

| 컬럼명 | 자료형 | 필수 여부 | 설명 |
|---|---|---|---|
| id | bigint | 필수 | 과목을 구분하는 고유 번호 |
| name | text | 필수 | 과목명 |
| exam_date | date | 필수 | 시험 날짜 |
| understanding | integer | 필수 | 현재 이해도 1~5 |
| importance | integer | 필수 | 과목 중요도 1~5 |
| priority_score | numeric | 필수 | 계산된 우선순위 점수 |
| created_at | timestamptz | 필수 | 과목 정보 생성 시각 |

## 데이터 예시

```json
{
  "id": 1,
  "name": "한방병리학",
  "exam_date": "2026-07-25",
  "understanding": 2,
  "importance": 5,
  "priority_score": 90,
  "created_at": "2026-07-15T10:00:00+09:00"
}