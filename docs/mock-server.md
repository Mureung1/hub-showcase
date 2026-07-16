# Express mock 서버 테스트

이 문서는 면담 신청 생성부터 멘토 수락, 멘토·멘티의 확정 상태 확인까지 테스트하는 방법을 설명한다.

## 1. 서버 실행

프로젝트 루트에서 다음 명령을 실행한다.

```bash
cd server
npm install
npm start
```

기본 서버 주소는 `http://localhost:4000`이다. mock 데이터는 메모리에 저장되므로 서버를 다시 시작하면 생성한 신청이 초기화된다.

테스트에 사용할 고정 사용자 ID는 다음과 같다.

| 역할 | 사용자 ID |
|---|---|
| 멘티 | `mentee-1` |
| 멘토 | `mentor-1` |
| 멘토 | `mentor-2` |

모든 applications API 요청에는 로그인할 사용자의 ID를 `x-mock-user-id` 헤더로 전달해야 한다.

## 2. 멘티가 면담 신청 생성

```bash
curl -X POST "http://localhost:4000/api/applications" \
  -H "x-mock-user-id: mentee-1" \
  -H "Content-Type: application/json" \
  -d '{
    "mentorIds": ["mentor-1"],
    "questionnaire": {
      "introduction": "재료공학과 4학년입니다.",
      "concern": "연구실 선택 기준이 고민입니다.",
      "goal": "대학원 준비 순서를 알고 싶습니다.",
      "preferredTime": "화요일 19:00"
    }
  }'
```

응답 상태 코드는 `201`이며 다음과 같은 결과가 반환된다.

```json
{
  "data": {
    "id": "application-id",
    "status": "pending",
    "mentorIds": ["mentor-1"],
    "questionnaire": {
      "introduction": "재료공학과 4학년입니다.",
      "concern": "연구실 선택 기준이 고민입니다.",
      "goal": "대학원 준비 순서를 알고 싶습니다.",
      "preferredTime": "화요일 19:00"
    },
    "createdAt": "2026-07-16T00:00:00.000Z"
  }
}
```

다음 단계에서 사용할 수 있도록 응답의 `data.id` 값을 복사한다.

## 3. 멘토가 본인 신청 목록 조회

```bash
curl "http://localhost:4000/api/applications" \
  -H "x-mock-user-id: mentor-1"
```

방금 생성한 신청이 포함되어야 하며, 수락 전에는 다음 두 상태가 모두 `pending`이어야 한다.

```json
{
  "applicationStatus": "pending",
  "mentorStatus": "pending"
}
```

대기 신청만 조회하려면 `status` 쿼리를 사용할 수 있다.

```bash
curl "http://localhost:4000/api/applications?status=pending" \
  -H "x-mock-user-id: mentor-1"
```

## 4. 멘토가 신청 수락

아래 URL의 `application-id`를 신청 생성 응답에서 복사한 실제 `data.id` 값으로 바꾼다.

```bash
curl -X PATCH "http://localhost:4000/api/applications/application-id/accept" \
  -H "x-mock-user-id: mentor-1"
```

응답 상태 코드는 `200`이며 `status`는 `confirmed`, `acceptedMentorId`는 `mentor-1`이어야 한다.

```json
{
  "data": {
    "id": "application-id",
    "status": "confirmed",
    "acceptedMentorId": "mentor-1",
    "updatedAt": "2026-07-16T00:01:00.000Z"
  }
}
```

## 5. 멘토가 수락 후 신청 목록 재조회

```bash
curl "http://localhost:4000/api/applications" \
  -H "x-mock-user-id: mentor-1"
```

수락한 신청의 상태가 다음과 같이 변경되어야 한다.

```json
{
  "applicationStatus": "confirmed",
  "mentorStatus": "confirmed",
  "acceptedMentorId": "mentor-1"
}
```

확정 신청만 조회할 수도 있다.

```bash
curl "http://localhost:4000/api/applications?status=confirmed" \
  -H "x-mock-user-id: mentor-1"
```

## 6. 멘티가 신청 목록 조회

```bash
curl "http://localhost:4000/api/applications" \
  -H "x-mock-user-id: mentee-1"
```

같은 신청이 멘티 응답에도 포함되어야 하며, `status`는 `confirmed`, `acceptedMentorId`는 `mentor-1`이어야 한다.

```json
{
  "status": "confirmed",
  "acceptedMentorId": "mentor-1"
}
```

멘티의 확정 신청만 조회하려면 다음 요청을 사용한다.

```bash
curl "http://localhost:4000/api/applications?status=confirmed" \
  -H "x-mock-user-id: mentee-1"
```

프론트엔드에서는 API 상태값을 다음과 같이 표시한다.

| API 상태 | 화면 표시 |
|---|---|
| `pending` | 대기 |
| `confirmed` | 확정 |
| `completed` | 완료 |
| `rejected` | 거부 |
