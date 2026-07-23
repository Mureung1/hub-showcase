# Newssist API 명세서

공통 규칙: 성공 시 데이터를 그대로 반환, 실패 시 `{ "error": "snake_case_code" }`. `인증` 표시된 엔드포인트는 `Authorization: Bearer <access_token>` 헤더가 필요함.

이 파일이 바뀌면(엔드포인트 추가/변경) Claude가 먼저 알려주고, Notion 쪽 동기화는 사용자가 직접 함.

## 프로필

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `POST /api/profile` | 회원가입 직후 1회, profiles row 생성 + 온보딩 키워드 등록 | ✅ | `{ nickname?, keywordIds: string[] }` | `{ id, nickname, onboardingCompleted }` |
| `GET /api/profile` | 내 프로필 조회 | ✅ | - | `{ id, nickname, onboardingCompleted, createdAt }` |

## 키워드 (`routes/keywords.js`)

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `GET /api/keywords` | 전체 키워드 카탈로그 (온보딩용) | ❌ | - | `[{ id, name }]` |
| `GET /api/keywords/mine` | 내 관심 키워드 목록 (우선순위순) | ✅ | - | `[{ id, name, priority }]` |
| `POST /api/keywords/mine` | 관심 키워드 등록/수정 (UPSERT) | ✅ | `{ keywordId, priority }` | `{ id, keywordId, priority }` |
| `DELETE /api/keywords/mine/:keywordId` | 관심 키워드 삭제 | ✅ | - | `{ success: true }` |

## 기사 (`routes/articles.js`)

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `GET /api/articles?page=&limit=` | 메인 피드 (내 관심 키워드 기준) | ✅ | - | `[{ id, title, source, thumbnailUrl, publishedAt, keywords }]` |
| `GET /api/articles/:id` | 기사 상세 (본문 + 용어 목록) | ✅ | - | `{ id, title, content, source, publishedAt, terms: [{ term, explanation }] }` |
| `POST /api/articles/:id/read` | 읽음 처리 (UPSERT read_history) | ✅ | - | `{ success: true }` |
| `GET /api/articles/:id/summary` | AI 요약 (난이도 구분 없음, 캐시 우선) | ✅ | - | `{ content }` |
| `GET /api/articles/:id/simplify?level=easy\|medium` | 쉽게 설명 — 원문을 해당 난이도로 다시 쓴 글 (캐시 우선) | ✅ | - | `{ level, content }` |
| `GET /api/articles/:id/related` *(스트레치)* | 연관 기사 추천 (임베딩 유사도) | ✅ | - | `[{ id, title, similarity }]` |

`summary`, `simplify`, `related`는 AI/DB 부하 있는 엔드포인트라 `express-rate-limit` 적용.

## 북마크 (`routes/bookmarks.js`)

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `GET /api/bookmarks` | 내 북마크 목록 | ✅ | - | `[{ id, article }]` |
| `POST /api/bookmarks` | 북마크 추가 | ✅ | `{ articleId }` | `{ id, articleId }` |
| `DELETE /api/bookmarks/:articleId` | 북마크 해제 | ✅ | - | `{ success: true }` |

## 인사이트/클러스터 (`routes/insights.js`)

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `GET /api/insights/clusters` | 내 최신 클러스터 목록 (최신 batch_date 기준) | ✅ | - | `[{ id, title, description, articleCount, articles: [{ id, title }] }]` (articles는 대표 기사 최신 2개) |
| `GET /api/insights/clusters/:id` | 클러스터 상세 (기사 목록 포함) | ✅ | - | `{ id, title, description, articles: [...] }` |

## 리포트 (`routes/reports.js`)

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `GET /api/reports/weekly` | 이번 주 리포트 조회 | ✅ | - | `{ weekStartDate, content }` (없으면 404 `{ error: "report_not_found" }`) |
| `POST /api/reports/weekly/generate` | 수동 생성 트리거 (배치 전에 데모용으로 필요할 수 있음) | ✅ | - | `{ weekStartDate, content }` |

## 트렌드 (`routes/trend.js`, 스트레치)

| Method/Path | 설명 | 인증 | Request | Response |
|---|---|---|---|---|
| `GET /api/trend` | 오늘 기준 트렌드 랭킹 | ❌ | - | `[{ keyword, rank, rankChange, mentionCount }]` |

## 공통 에러 코드

`unauthorized`(토큰 없음/무효), `not_found`, `rate_limited`, `invalid_request`, `db_connection_failed`, `report_not_found`
