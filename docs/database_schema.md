# ShortsGen 데이터 스키마

## 테이블 개요

| 테이블 | 담당 시나리오 단계 | 한 줄 요약 |
| --- | --- | --- |
| `store_info` | ① 정보 세팅 | 매장의 기본 정보를 담는 마스터 테이블 |
| `crawl_jobs` | ② 트렌드 확인 | SNS 크롤링 실행 이력 |
| `raw_trend_posts` | ② 트렌드 확인 | 크롤링해온 원본 게시물 데이터 |
| `trend_keywords` | ② 트렌드 확인 | 원본 게시물에서 집계한 트렌드 해시태그/키워드 데이터 |
| `video_templates` | ③ 기획 세팅 | 자주 쓰는 홍보 목적/분위기 조합 템플릿 |
| `generated_reels` | ⑤⑥ AI 가동/발행 | AI가 만들어낸 결과 영상과 발행 상태 |

## 핵심 흐름

```text
StoreInfo 입력
→ CrawlJobs 생성
→ RawTrendPosts 저장
→ TrendKeywords 집계
→ VideoTemplates 선택
→ GeneratedReels 생성 및 발행 상태 기록
```

## Entity 설명

### StoreInfo

사장님이 입력하는 가게 기본 정보입니다. 트렌드 매칭과 릴스 생성의 기준 데이터로 사용합니다.

| 필드 | 설명 |
| --- | --- |
| `store_id` | 매장 고유 ID |
| `store_name` | 매장명 |
| `owner_name` | 대표자명 |
| `category` | 업종 |
| `location` | 매장 위치 |
| `signature_item` | 주력 메뉴/시그니처 상품 |
| `created_at` | 생성 시각 |
| `updated_at` | 수정 시각 |

### CrawlJobs

틱톡/인스타그램 크롤링 작업의 실행 상태를 기록합니다. 언제, 어떤 플랫폼에서, 어떤 키워드로 수집했는지 추적합니다.

| 필드 | 설명 |
| --- | --- |
| `crawl_job_id` | 크롤링 작업 고유 ID |
| `platform` | `instagram` 또는 `tiktok` |
| `target_category` | 수집 대상 업종 |
| `target_keyword` | 수집 대상 키워드 |
| `status` | `pending`, `running`, `success`, `failed` |
| `started_at` | 시작 시각 |
| `finished_at` | 종료 시각 |
| `collected_count` | 수집된 게시물 수 |
| `error_message` | 실패 사유 |

### RawTrendPosts

SNS에서 가져온 원본 게시물 데이터입니다. 분석 전에 최대한 원본 형태로 보관합니다.

| 필드 | 설명 |
| --- | --- |
| `raw_post_id` | 원본 게시물 고유 ID |
| `crawl_job_id` | 연결된 크롤링 작업 ID |
| `platform` | 수집 플랫폼 |
| `source_url` | 게시물 URL |
| `external_post_id` | 플랫폼 내부 게시물 ID |
| `author_name` | 작성자명 |
| `caption` | 게시글 본문 |
| `hashtags` | 해시태그 목록 |
| `music_title` | 사용 음원명 |
| `view_count` | 조회수 |
| `like_count` | 좋아요 수 |
| `comment_count` | 댓글 수 |
| `share_count` | 공유 수 |
| `posted_at` | 게시 시각 |
| `crawled_at` | 수집 시각 |

### TrendKeywords

원본 게시물에서 추출/집계한 트렌드 데이터입니다. 대시보드의 차트와 해시태그 Pill에 사용합니다.

| 필드 | 설명 |
| --- | --- |
| `keyword_id` | 키워드 고유 ID |
| `category` | 관련 업종 |
| `hashtag` | 해시태그 |
| `keyword` | 해시태그에서 추출한 일반 키워드 |
| `platform` | `instagram`, `tiktok`, `mixed` |
| `search_volume` | 검색량 또는 관심도 지표 |
| `post_count` | 관련 게시물 수 |
| `total_views` | 관련 게시물 조회수 합계 |
| `total_likes` | 관련 게시물 좋아요 합계 |
| `trend_score` | 최종 트렌드 점수 |
| `crawled_at` | 집계 기준 시각 |

### VideoTemplates

사장님이 자주 쓰는 기획 방향성 조합입니다. 릴스 생성 화면에서 재사용할 수 있습니다.

| 필드 | 설명 |
| --- | --- |
| `template_id` | 템플릿 고유 ID |
| `store_id` | 연결된 매장 ID |
| `purpose` | 홍보 목적 |
| `mood` | 영상 분위기 |
| `custom_keyword` | 사용자 지정 키워드 |
| `created_at` | 생성 시각 |
| `updated_at` | 수정 시각 |

### GeneratedReels

AI 파이프라인을 통해 생성된 영상 결과와 발행 상태를 저장합니다.

| 필드 | 설명 |
| --- | --- |
| `reels_id` | 영상 고유 ID |
| `store_id` | 연결된 매장 ID |
| `template_id` | 사용한 템플릿 ID |
| `video_url` | 완성 영상 URL |
| `thumbnail_url` | 썸네일 URL |
| `used_hashtags` | 영상에 사용한 해시태그 |
| `generation_status` | 생성 상태 |
| `publish_status` | 발행 상태 |
| `is_published` | SNS 발행 여부 |
| `created_at` | 생성 시각 |
| `published_at` | 발행 시각 |

## 관계

- `store_info` 1개는 여러 개의 `video_templates`를 가질 수 있습니다.
- `store_info` 1개는 여러 개의 `generated_reels`를 가질 수 있습니다.
- `crawl_jobs` 1개는 여러 개의 `raw_trend_posts`를 가질 수 있습니다.
- `raw_trend_posts`는 `trend_keywords` 집계의 원천 데이터입니다.
- `trend_keywords`는 특정 매장에 직접 종속되지 않고, `category` 기준으로 매장과 매칭합니다.
