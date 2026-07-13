# DB 스키마 초안 (T02)

작성일: 2026-07-13

## 테이블 관계 요약

- `users` 1 : N `diagnoses` — 회원 한 명이 여러 번 진단
- `users` 1 : N `user_supplements` — 회원이 현재 복용 중인 성분 목록 (마이페이지에서 수정 가능)
- `diagnoses` 1 : N `diagnosis_symptoms` — 진단 하나에 증상 여러 개
- `diagnoses` 1 : N `diagnosis_ingredients` — 진단 하나에 추천 성분 여러 개
- `symptoms` 1 : N `diagnosis_symptoms`
- `ingredients` 1 : N `diagnosis_ingredients`, `product_ingredients`, `user_supplements`
- `products` 1 : N `product_ingredients` — 제품 하나에 성분 여러 개 (함량 포함)

## `users`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| email | VARCHAR | 로그인 아이디 |
| password | VARCHAR | 비밀번호 (해시 저장) |
| name | VARCHAR | 이름/닉네임 |
| created_at | TIMESTAMP | 가입 시각 |

## `symptoms`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| name | VARCHAR | 증상 이름 (예: 피로, 소화불량) |

## `diagnoses`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| user_id | INTEGER FK → users.id | 진단한 회원 |
| life_pattern | VARCHAR | 선택한 생활 패턴 |
| created_at | TIMESTAMP | 진단 시각 |

## `diagnosis_symptoms`

진단 ↔ 증상 연결 (다대다)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| diagnosis_id | INTEGER FK → diagnoses.id | 어떤 진단인지 |
| symptom_id | INTEGER FK → symptoms.id | 어떤 증상인지 |
| created_at | TIMESTAMP | 생성 시각 |

## `ingredients`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| name | VARCHAR | 성분 이름 (예: 밀크씨슬) |
| category | VARCHAR | 성분 카테고리 (예: 비타민류, 미네랄류) |
| upper_limit_mg | NUMERIC | 하루 상한 섭취량 (mg) — 중복 체크 계산에 사용 |
| description | TEXT | 효능 설명 |
| created_at | TIMESTAMP | 생성 시각 |

## `products`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| name | VARCHAR | 제품명 |
| company_name | VARCHAR | 업체명 |
| price | INTEGER | 가격 |
| image_url | VARCHAR | 제품 이미지 |
| haccp_certified | BOOLEAN | HACCP 인증 여부 |
| test_report_url | VARCHAR | 시험성적서 링크/파일 |
| smartstore_url | VARCHAR | 스마트스토어 구매 링크 |
| created_at | TIMESTAMP | 생성 시각 |

> 기업 규모(대기업/중소기업/소상공인) 컬럼은 의도적으로 제외 — 서비스가 기업 규모 무관 성분/품질 기준을 지향하므로 노출하지 않음.

## `product_ingredients`

제품 ↔ 성분 연결 (다대다, 함량 포함)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| product_id | INTEGER FK → products.id | 어떤 제품인지 |
| ingredient_id | INTEGER FK → ingredients.id | 어떤 성분인지 |
| amount_mg | NUMERIC | 함유량 (mg) |
| created_at | TIMESTAMP | 생성 시각 |

## `diagnosis_ingredients`

진단 ↔ 추천 성분 연결 (다대다)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| diagnosis_id | INTEGER FK → diagnoses.id | 어떤 진단인지 |
| ingredient_id | INTEGER FK → ingredients.id | 어떤 성분이 추천됐는지 |
| created_at | TIMESTAMP | 생성 시각 |

## `user_supplements`

회원이 현재 복용 중인 성분 목록 (마이페이지에서 추가/수정/삭제 가능)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | SERIAL PK | 고유 번호 |
| user_id | INTEGER FK → users.id | 어떤 회원인지 |
| ingredient_id | INTEGER FK → ingredients.id | 어떤 성분인지 |
| amount_mg | NUMERIC | 하루 복용량 (mg) |
| created_at | TIMESTAMP | 추가 시각 |
