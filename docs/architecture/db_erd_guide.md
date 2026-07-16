# ERD 안내서

이 문서는 [db.vuerd.json](db.vuerd.json)의 테이블과 관계를 서비스 흐름에 맞춰 설명한다. ERD 편집은 VS Code ERD Editor에서 하되, 편집 전에 디스크의 최신 파일을 다시 불러온다.

## 먼저 보는 구조

| 영역 | 테이블 | 역할 |
| --- | --- | --- |
| 인증 | `users` | Firebase Authentication으로 식별된 서비스 사용자를 관리한다. |
| 레시피 | `recipes` | 사용자의 레시피 목록에 보이는 레시피 한 건이다. |
| 레시피 구성 | `ingredients`, `recipe_steps`, `recipe_sources` | 재료와 조리 단계, 선택적 외부 출처를 저장한다. |
| 기록 | `recipe_audit_events` | 레시피 삭제와 복원 행위를 기록한다. |
| 열람 공유 | `recipe_view_shares` | 로그인 없이 열 수 있는 공유 링크의 활성 상태를 관리한다. |
| 전달 공유 | `transfer_invitations`, `received_recipe_details` | 전달 초대의 스냅샷과 전달받은 레시피의 관계·기억을 보관한다. |

ERD의 선은 1:N 또는 1:0..1 관계를 나타낸다. 다대다 관계는 사용하지 않는다.

## ERD 표기 읽기

* `PK`: 행을 식별하는 기본 키다. 독립 엔터티는 UUID를 사용하고, 재료와 조리 단계는 `recipe_id, position` 복합 키를 사용한다.
* `NN`: 값이 반드시 있어야 한다. 예를 들어 `recipes.owner_id`가 없으면 레시피의 주인을 알 수 없다.
* `UQ`: 같은 값이 두 번 저장될 수 없다. Firebase UID와 공유 토큰 해시 등이 여기에 해당한다.
* `FK`: 다른 테이블의 행을 가리키는 외래 키다. ERD의 선은 이 키를 뜻한다.

## 테이블별 설명

### 사용자와 로그인

* `users`: Firebase Authentication의 변경되지 않는 식별자(`firebase_uid`)와 표시 정보(`email`, `name`, `profile_image_url`)를 보관한다. `firebase_uid`만 고유하며 이메일은 변경되거나 제공되지 않을 수 있다. Firebase ID 토큰과 provider access token은 저장하지 않는다.

### 내 레시피

* `recipes`: 레시피의 중심 테이블이다. `owner_id`가 레시피북 소유자를 가리키고, `type`은 `OWNED`, `EXTERNAL`, `RECEIVED` 중 하나다. 제목, 인분, 조리 시간, 메모처럼 목록·상세에 필요한 공통 정보도 여기에 있다.
* `ingredients`: 한 레시피에 속한 재료다. `position`으로 화면에 보이는 순서를 보존한다.
* `recipe_steps`: 한 레시피에 속한 조리 단계다. `position`으로 순서를 보존하고 `description`에 조리 내용을 저장한다.
* `recipe_sources`: 외부 출처가 있는 레시피에만 붙는 선택적 정보다. `recipe_id`가 PK이므로 레시피마다 최대 한 건이며 URL, 제목과 작성자를 저장한다.
* `recipe_audit_events`: 레시피 삭제와 복원 이벤트를 행위 사용자 및 발생 시각과 함께 남긴다.

### 열람 공유

* `recipe_view_shares`: `OWNED` 또는 `EXTERNAL` 레시피마다 최대 하나인 열람 링크다. 원문 토큰 대신 고유한 `token_hash`를 저장하고, `revoked_at`이 있으면 링크를 비활성으로 판단한다. 링크 열람은 로그인과 무관하므로 사용자를 직접 참조하지 않는다.

### 전달 공유와 전달받은 레시피

* `transfer_invitations`: `OWNED` 레시피를 전달하기 위한 일회성 초대다. 초대가 만들어질 때 제목·재료·단계 등의 `recipe_snapshot`을 JSONB로 고정한다. 원본이 나중에 수정되어도 전달 내용이 바뀌지 않게 하기 위해서다.
* `received_recipe_details`: 초대 수락으로 생성된 `RECEIVED` 레시피에만 붙는 상세 정보다. 원본 레시피와 원 작성자를 연결하고, 수신자가 직접 적은 `sender_display_name`, 관계, 받은 날짜를 저장한다.

현재 MVP에서는 원 작성자만 전달 초대를 만들 수 있다. 따라서 시스템상 전달자는 원 작성자와 같으며 별도 `sender_user_id`를 저장하지 않는다. 초대를 수락한 사용자는 생성된 `RECEIVED` 레시피의 `recipes.owner_id`로 알 수 있어 별도 `accepted_by_user_id`도 필요하지 않다.

## 핵심 흐름으로 따라가기

### 1. 로그인

Google 로그인에 성공하면 프론트엔드는 Firebase ID 토큰을 보호 API에 전달한다. 서버는 Firebase Admin SDK로 토큰을 검증하고 토큰의 `uid`를 `users.firebase_uid`와 연결해 사용자를 찾거나 만든다. 별도 서버 세션은 저장하지 않는다.

```text
Firebase ID token uid ─── users.firebase_uid
```

### 2. 레시피 저장

사용자가 AI 초안을 수정하고 저장하면 먼저 `recipes` 행이 생성된다. 이어서 재료와 단계가 자식 행으로 저장되고, 외부 URL이 있는 경우에만 출처 행이 생성된다.

```text
users 1 ─── N recipes
recipes 1 ─── N ingredients
        1 ─── N recipe_steps
        1 ─── 0..1 recipe_sources
        1 ─── N recipe_audit_events
```

### 3. 공유

열람 공유는 `recipe_view_shares` 한 건으로 관리한다. 공개 URL은 이 테이블의 활성 토큰만 검사하고, 로그인은 요구하지 않는다.

전달 공유는 `transfer_invitations`에 당시의 레시피 스냅샷을 고정한다. 로그인한 수신자가 수락하면 자기 소유의 `RECEIVED` 레시피가 만들어지고, 그 레시피에 `received_recipe_details`가 한 건 연결된다.

```text
recipes 1 ─── 0..1 recipe_view_shares
recipes 1 ─── N transfer_invitations
transfer_invitations 1 ─── 0..1 received_recipe_details ─── 1 recipes (RECEIVED)
```

## 중복을 피한 기준

다음 정보는 비슷해 보여도 목적이 달라 유지한다.

* 초대의 `recipe_snapshot`과 수락 뒤의 `RECEIVED` 레시피 사본: 수락 전 미리보기와 수락 후 개인 레시피북을 각각 안정적으로 제공하기 위한 의도적인 복사다.
* `original_owner_name`, `original_owner_profile_image_url`: 원 작성자 표시가 계정 정보 변경에 흔들리지 않도록 전달 당시 값으로 남기는 스냅샷이다.

반대로 다음 정보는 같은 사실을 두 번 저장하므로 제거했다.

* 시스템상 전달자: `source_recipe_id`가 가리키는 레시피의 `owner_id`로 알 수 있다.
* 초대 수락자: 전달받은 레시피의 `owner_id`로 알 수 있다.
* 재전달 가능 여부: `RECEIVED` 레시피는 재전달할 수 없다는 정책에서 항상 `false`로 계산된다.

## 꼭 기억할 정책

| 레시피 유형 | 원본 수정 | 열람 공유 | 전달 공유 |
| --- | --- | --- | --- |
| `OWNED` | 가능 | 가능 | 가능 |
| `EXTERNAL` | 가능 | 가능 | 불가 |
| `RECEIVED` | 불가 | 불가 | 불가 |

열람 링크 조회는 비로그인으로 가능하다. 반면 전달 링크 미리보기와 수락은 로그인한 사용자만 가능하며, 한 초대는 한 번만 수락된다.

## 아직 ERD에 넣지 않은 것

조리 팁은 현재 핵심 흐름의 저장·AI·API 범위에서 제외했으므로 테이블도 만들지 않았다. ORM 선택, 외래 키 삭제 정책(cascade), 영구 삭제와 감사 로그 보존 기간도 구현 단계에서 확정할 운영 정책이다.
