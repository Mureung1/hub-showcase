# Database Design

후보 제안, 좋아요, 관리자 검토를 지원하는 목표 DB 구조다. 2주차 수직 슬라이스에서는 `users`, `photo_spots`, `photo_guides`부터 생성하고, 좋아요와 검토 테이블은 이후 연결한다.

```mermaid
erDiagram
    USERS ||--o{ PHOTO_SPOTS : submits
    USERS ||--o{ PHOTO_GUIDES : creates
    USERS ||--o{ GUIDE_LIKES : likes
    USERS ||--o{ MODERATION_REVIEWS : reviews

    PHOTO_SPOTS ||--o{ PHOTO_GUIDES : has
    PHOTO_GUIDES ||--o{ GUIDE_LIKES : receives
    PHOTO_GUIDES ||--o{ MODERATION_REVIEWS : reviewed_in

    USERS {
      uuid id PK
      string naver_user_id UK
      string nickname
      string role "user | admin"
      timestamp created_at
    }

    PHOTO_SPOTS {
      uuid id PK
      string name
      decimal latitude
      decimal longitude
      string status "candidate | official | rejected"
      uuid created_by FK
      timestamp created_at
    }

    PHOTO_GUIDES {
      uuid id PK
      uuid spot_id FK
      uuid submitted_by FK
      string reference_image_url
      string overlay_image_url
      jsonb guide_json
      string frame_type "solo | couple"
      decimal shooting_latitude
      decimal shooting_longitude
      int like_count
      timestamp created_at
    }

    GUIDE_LIKES {
      uuid id PK
      uuid guide_id FK
      uuid user_id FK
      timestamp created_at
    }

    MODERATION_REVIEWS {
      uuid id PK
      uuid guide_id FK
      uuid admin_id FK
      string result "approved | rejected"
      string note
      timestamp reviewed_at
    }
```

## Rules

- `guide_likes`에는 `(user_id, guide_id)` 유니크 제약을 둔다.
- 사용자는 후보만 제안할 수 있다. `official` 전환은 관리자 검토 결과로만 처리한다.
- `guide_json`에는 배경 윤곽, 수평선, 1인 또는 커플 프레임의 비율 좌표를 저장한다.
- 사진 원본과 생성 Overlay PNG는 Supabase Storage에 두고, DB에는 URL과 메타데이터만 저장한다.
- 접근 권한과 RLS 원칙은 [security.md](./security.md)를 따른다.
