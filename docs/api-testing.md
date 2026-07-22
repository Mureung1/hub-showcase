# API curl 테스트

이 문서는 면담 신청 생성부터 멘토 수락, 멘토·멘티의 확정 상태 확인까지 실제 서버(Supabase DB 연동)로 테스트하는 방법을 설명한다.

## 1. 서버 실행

프로젝트 루트에서 다음 명령을 실행한다.

```bash
cd server
npm install
npm start
```

기본 서버 주소는 `http://localhost:4000`이다. 모든 데이터는 실제 Supabase DB에 저장되므로, 서버를 다시 시작해도 생성한 신청은 초기화되지 않는다. 테스트로 만든 계정·신청은 필요하면 Supabase 대시보드에서 직접 정리한다.

## 2. 로그인해서 access token 발급받기

모든 API는 실제 Supabase 인증을 사용한다. 요청마다 로그인해서 받은 access token을 `Authorization: Bearer <token>` 헤더로 전달해야 한다.

멘티 계정으로 로그인:

```bash
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{ "email": "mentee@example.com", "password": "비밀번호" }'
```

응답의 `data.accessToken` 값을 복사해 이후 요청에서 사용한다. 편의를 위해 셸 변수로 저장해 둔다.

```bash
MENTEE_TOKEN="복사한 access token"
MENTOR_TOKEN="복사한 access token"
```

계정이 아직 없다면 `POST /api/auth/signup/mentee`, `POST /api/auth/signup/mentor`로 먼저 회원가입한다(요청 형식은 `docs/api.md` 4장 참고).

신청을 생성하려면 실제 멘토 UUID가 필요하다. 멘토 목록을 조회해 `id` 값을 확인한다.

```bash
curl "http://localhost:4000/api/mentors" \
  -H "Authorization: Bearer $MENTEE_TOKEN"
```

## 3. 멘티가 면담 신청 생성

```bash
curl -X POST "http://localhost:4000/api/applications" \
  -H "Authorization: Bearer $MENTEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mentorIds": ["<위에서 확인한 멘토 UUID>"],
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
    "id": "application-uuid",
    "status": "pending",
    "mentorIds": ["mentor-uuid"],
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

다음 단계에서 사용할 수 있도록 응답의 `data.id` 값을 복사해 둔다.

```bash
APPLICATION_ID="복사한 application id"
```

## 4. 멘토가 본인 신청 목록 조회

```bash
curl "http://localhost:4000/api/applications" \
  -H "Authorization: Bearer $MENTOR_TOKEN"
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
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

## 5. 멘토가 신청 수락

```bash
curl -X PATCH "http://localhost:4000/api/applications/$APPLICATION_ID/accept" \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

응답 상태 코드는 `200`이며 `status`는 `confirmed`, `acceptedMentorId`는 로그인한 멘토의 UUID여야 한다.

```json
{
  "data": {
    "id": "application-uuid",
    "status": "confirmed",
    "acceptedMentorId": "mentor-uuid",
    "updatedAt": "2026-07-16T00:01:00.000Z"
  }
}
```

수락과 동시에 `meetings` 행이 빈 값(`scheduledAt: null`, `place: null`)으로 자동 생성된다(`docs/api.md` 6.3, 7장 참고). 면담 시간·장소는 이어서 `PATCH /api/meetings/:meetingId`로 채운다.

## 6. 멘토가 수락 후 신청 목록 재조회

```bash
curl "http://localhost:4000/api/applications" \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

수락한 신청의 상태가 다음과 같이 변경되어야 한다.

```json
{
  "applicationStatus": "confirmed",
  "mentorStatus": "confirmed",
  "acceptedMentorId": "mentor-uuid"
}
```

확정 신청만 조회할 수도 있다.

```bash
curl "http://localhost:4000/api/applications?status=confirmed" \
  -H "Authorization: Bearer $MENTOR_TOKEN"
```

## 7. 멘티가 신청 목록 조회

```bash
curl "http://localhost:4000/api/applications" \
  -H "Authorization: Bearer $MENTEE_TOKEN"
```

같은 신청이 멘티 응답에도 포함되어야 하며, `status`는 `confirmed`, `acceptedMentorId`는 수락한 멘토의 UUID여야 한다.

```json
{
  "status": "confirmed",
  "acceptedMentorId": "mentor-uuid"
}
```

멘티의 확정 신청만 조회하려면 다음 요청을 사용한다.

```bash
curl "http://localhost:4000/api/applications?status=confirmed" \
  -H "Authorization: Bearer $MENTEE_TOKEN"
```

프론트엔드에서는 API 상태값을 다음과 같이 표시한다.

| API 상태 | 화면 표시 |
|---|---|
| `pending` | 대기 |
| `confirmed` | 확정 |
| `completed` | 완료 |
| `rejected` | 거부 |
