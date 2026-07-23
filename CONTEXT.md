# CONTEXT — 소상공인 정부지원금 큐레이터

제품 언어와 현재 제약을 빠르게 파악하기 위한 문서. 전체 문서 지도는 [`README.md`](README.md),
작업 유형별로 확인할 것은 [`AGENTS.md`](AGENTS.md) 참고.

## 한 줄 요약

소상공인이 업종·지역·사업 규모를 입력하면, 조건에 맞는 정부 지원금을 **매칭·정렬**해 보여주고
**외부 기관 사이트로 신청을 연결**하는 MVP 서비스.

## 핵심 기능 (MVP)

1. **조건 매칭 + 정렬** — 업종/지역/직원수/연매출(와이어프레임) + 업력(plan, API 필드)
2. **상세 + 외부 신청 연결** — 자격·서류·신청 방법, CTA는 외부 URL

전체 시나리오·MVP 제외 범위는 [`docs/plan.md`](docs/plan.md)가 단일 소스 — 여기서 재서술하지 않는다.

## 기술 스택 (현재 — 가정하면 안 되는 것 위주)

| 영역 | 실제 | 주의 |
|------|------|------|
| 프론트엔드 | React 19 + TypeScript + Vite (`src/`) | README의 Next.js 언급은 **구 스택**, 무시할 것 |
| 백엔드 | Express 4 + TypeScript (`server/`) | |
| 공유 타입 | TypeScript (`shared/`) | |
| DB | PostgreSQL (Supabase) | 스키마 연동 완료 (Week 2 #3) |
| 크롤러 | Node.js + 기업마당 공식 Open API (`fetch`) | **Cheerio 아님** — 스크래핑 대신 공식 REST API 사용 (Week 3 #28~#32) |
| 스케줄링 | GitHub Actions cron (`.github/workflows/crawler.yml`) | 매일 00:00 UTC 자동 실행 |
| 배포 | 미확정 | 이전 GitHub Pages 자동배포(`deploy-pages.yml`)는 제거됨. API 호스팅 미정 |

## 데이터 소스

1. **확정**: [기업마당](https://www.bizinfo.go.kr) Open API — `crawler/`에서 매일 수집
2. 후순위(미착수): K-스타트업, 소진공, 지자체

## 화면·라우트

```
/                      Welcome
/onboarding/:step(1-4)  조건 입력
/onboarding/complete   완료 요약
/home                  매칭 리스트
/subsidies/:id         상세
```

## plan.md ↔ 와이어프레임 차이

기획서와 와이어프레임이 다른 부분은 모순이 아니라 의도적 단계적 구현 — 전체 표는
[`docs/plan.md`의 "구현 보충"](docs/plan.md#구현-보충-와이어프레임--claudemd-기준) 참고
(여기서 재서술하지 않음).

## 아직 결정 안 된 것

이번 주(Week N) 범위의 리스크/결정은 `docs/weekN_plan.md`의 리스크 표에서 관리한다. 아래는
아직 어느 주차 계획에도 안 들어간, 더 뒤(3~4주차) 미정 사항만 남긴다:

- 매칭 점수 알고리즘 가중치 (지금은 mock 값 또는 크롤러 중립값 50)
- API·프론트 배포 타겟 및 env 분리
- E2E/수동 테스트 체크리스트
- `districts`(전국 지역 데이터) 소스 — 정적 JSON vs API
