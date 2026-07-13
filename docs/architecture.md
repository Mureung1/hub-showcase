# 아키텍처

> 백엔드 개발 시작 시 작성 예정

## 전체 구조
- 프론트엔드 / 백엔드 구성도

## 프론트엔드
- 폴더 구조 및 레이어링
- 상태 관리 방식

## 백엔드
- 폴더 구조 및 레이어링
- 데이터베이스 구조

## API 명세 (확정 2026-07-13)

> 전체 명세(필드·타입·에러·example)는 **[openapi.yaml](openapi.yaml)** 이 단일 진실 소스.
> 서버 착수 후 `swagger-ui-express`로 `/api-docs`에 서빙 예정. FE mock JSON은 openapi.yaml의 example에서 복사한다.

| 메서드 | 경로 | 설명 | 주요 응답 |
| --- | --- | --- | --- |
| POST | `/api/analysis` | 프로필 분석 실행(동기) + 캐시 저장. 신선한 캐시(24h)면 재사용 | `200` Analysis |
| GET | `/api/analysis/:githubId` | 분석 캐시 조회 (프로필 화면 새로고침/재진입) | `200` Analysis / `404 ANALYSIS_NOT_FOUND` |
| POST | `/api/recommendations` | 추천 생성+저장. 재조회/필터링은 조건 바꿔 재 POST | `200` Recommendation (빈 결과는 `items: []`) |
| GET | `/api/recommendations/:id` | 저장된 추천 재조회 (목록·상세 새로고침 공용) | `200` Recommendation / `404` |
| GET | `/health` | 서버 상태 확인 | `200 { status: "ok" }` |

### 공통 에러 형식
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "githubId는 필수 입력값입니다." } }
```
- `400 VALIDATION_ERROR` — 필수값 누락·형식 오류
- `404 USER_NOT_FOUND` — 존재하지 않는 GitHub 사용자 (GitHub 404 매핑)
- `404 ANALYSIS_NOT_FOUND` / `404 RECOMMENDATION_NOT_FOUND` — 선행 리소스 없음
- `429 RATE_LIMITED` — GitHub rate limit 초과 매핑
- `500 INTERNAL_ERROR` — 서버 오류
- GitHub API 스펙은 백엔드 내부 구현으로 이 명세에 포함하지 않음 ([decisions.md](decisions.md) 참조)

## 데이터 흐름
- 프론트-백엔드 간 통신 방식 (요청/응답 흐름)

## 인프라 / 배포
- 배포 환경, CI/CD
