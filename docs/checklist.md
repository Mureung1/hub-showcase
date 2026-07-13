# 개발 체크리스트

주차별 작업 목록. 상세 맥락·컨벤션은 [`CLAUDE.md`](../CLAUDE.md), 기획은 [`plan.md`](./plan.md) 참고.

---

## 사전 준비 (완료)

- [x] React + Express 개발 환경 scaffolding (`server/`, `shared/`)
- [x] UI 와이어프레임 (`prototype/gov_subsidy_home_wireframe.html`)
- [x] 디자인 Skill (`.cursor/skills/gov-subsidy-design/`)
- [x] `CLAUDE.md` — 구조·컨벤션·커밋 규칙·결정 사항
- [x] API 샘플 엔드포인트 (`/api/health`, `/api/subsidies`)

---

## 1주차 — 데이터 소스 + 크롤러

- [ ] Supabase 프로젝트 생성 및 `subsidies` 테이블 스키마 확정
- [ ] 기업마당 수집 방식 결정 (공식 API vs Cheerio)
- [ ] `crawler/` 디렉토리 + `npm run crawl` 스크립트
- [ ] GitHub Actions cron 스케줄 설정
- [ ] 기업마당 100~200건 수집·DB 적재
- [ ] `districts` 전국 데이터 소스 결정 (정적 JSON vs API)
- [ ] 주변 소상공인 3~5명 니즈 인터뷰

---

## 2주차 — 필터링 + UI

- [ ] React Router 도입 및 온보딩·홈·상세 페이지
- [ ] 와이어프레임 기준 UI 구현 (`gov-subsidy-design` Skill)
- [ ] TanStack Query + API 연동
- [ ] 조건 매칭 API (query 또는 POST `/api/match`)
- [ ] 정렬: 매칭도순(기본) · 마감임박순 · 지원금액순
- [ ] AI 요약 파이프라인 범위 결정 및 연동 (선택)
- [ ] plan.md **업력(연차)** UI 추가 여부 결정

---

## 3주차 — 매칭 알고리즘 + UI 마무리

- [ ] 적합도 점수 알고리즘 가중치 확정
- [ ] 상세 화면 외부 신청 링크 연동
- [ ] 알림·탭바·즐겨찾기 — placeholder 처리 확인
- [ ] 버그 수정·UI 다듬기
- [ ] 배포 타겟 및 env 분리

---

## 4주차 — 검증 + 발표

- [ ] 사장님 인터뷰 / 필터링 정확도 체크
- [ ] 수동 테스트 체크리스트 완료
- [ ] 발표 자료 준비

---

## MVP 범위 리마인더 (하지 않을 것)

- 로그인 / 회원
- 관심 저장 · 마감 알림 (실기능)
- 서비스 내 신청서 작성
- 전국 모든 지자체 완전 커버
