# Docker MySQL 데이터 관리 가이드

ThingDong의 개발 데이터는 Docker 컨테이너 `thingdong-mysql` 안의 MySQL에 저장됩니다. 기본 데이터베이스 이름은 `thingdong`입니다.

## 1. 데이터베이스 시작과 상태 확인

```bash
cd Project
docker compose up -d
docker compose ps
```

`thingdong-mysql`의 상태가 `healthy`이면 사용할 수 있습니다.

## 2. MySQL 콘솔 열기

기본 개발 설정에서는 아래 명령으로 접속합니다. 비밀번호나 DB 이름을 `.env`에서 바꿨다면 그 값으로 바꾸세요.

```bash
docker exec -it thingdong-mysql mysql -uthingdong -pthingdong_pw thingdong
```

접속한 뒤에는 SQL 문장 끝에 세미콜론(`;`)을 붙입니다.

## 3. 데이터 조회

```sql
SHOW TABLES;

SELECT id, nickname, email FROM users;

SELECT id, title, status, current_participants, target_participants
FROM group_purchases
ORDER BY created_at DESC;

SELECT user_id, group_purchase_id, applied_at
FROM user_group_purchases;
```

## 4. 테스트용 공동구매 추가

먼저 방장 사용자 ID를 확인한 뒤, 그 ID를 `host_id`에 넣습니다.

```sql
INSERT INTO group_purchases (
  host_id, title, description, product_url,
  total_price, target_participants, current_participants, per_person_price,
  pickup_latitude, pickup_longitude, category, status, deadline_at,
  created_at, updated_at
) VALUES (
  1, '테스트 공동구매', 'Docker MySQL에서 직접 추가한 데이터', 'https://example.com/product',
  10000, 2, 0, 5000,
  37.5665, 126.9780, 'FOOD', 'RECRUITING', DATE_ADD(NOW(), INTERVAL 1 DAY),
  NOW(), NOW()
);
```

추가 후 프론트엔드를 새로고침하면 목록에 표시됩니다.

## 5. 데이터 수정과 삭제

수정 전에는 반드시 대상 행을 먼저 조회합니다.

```sql
SELECT id, title FROM group_purchases WHERE id = 1;

UPDATE group_purchases
SET title = '수정한 공동구매 제목', updated_at = NOW()
WHERE id = 1;
```

공동구매를 삭제할 때는 참여 데이터가 먼저 삭제되어야 외래 키 오류가 나지 않습니다.

```sql
START TRANSACTION;

DELETE FROM user_group_purchases WHERE group_purchase_id = 1;
DELETE FROM group_purchases WHERE id = 1;

COMMIT;
```

잘못 삭제했다면 `COMMIT` 전에 `ROLLBACK;`을 실행하세요.

## 6. 안전 규칙

- `DELETE`와 `UPDATE`에는 항상 `WHERE`를 붙입니다.
- 개발 DB의 전체 초기화는 `npm run db:reset`일 때만 실행합니다.
- 평소에는 `npm run db:sync`를 사용합니다. 기존 데이터를 지우지 않습니다.
- `docker compose down`은 컨테이너만 중지합니다. 데이터 볼륨은 남습니다.
- `docker compose down -v`는 Docker 볼륨까지 삭제하므로 모든 개발 데이터가 사라집니다.
- 자동 테스트는 별도 DB `thingdong_test`를 사용합니다. 개발 데이터 확인은 `thingdong`에서 합니다.

## 7. 백업

데이터를 크게 수정하기 전에는 백업 파일을 만듭니다.

```bash
docker exec thingdong-mysql mysqldump -uthingdong -pthingdong_pw thingdong > thingdong-backup.sql
```

복원은 아래처럼 합니다.

```bash
Get-Content thingdong-backup.sql | docker exec -i thingdong-mysql mysql -uthingdong -pthingdong_pw thingdong
```
