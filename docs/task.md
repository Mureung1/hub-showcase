# Task & Backlog — 마감할인 MVP

기준 문서: [기획서.md](./기획서.md)(범위·정책) · [visual-기획서.html](./visual-기획서.html)(화면 ID) · [CLAUDE.md](../CLAUDE.md)(스택·컨벤션)

목표: **남은 3주 내 "작동 + 시연"** — 등록 → 알림 → 예약(선착순 재고 차감) → 픽업 확인의 핵심 루프를 실 데이터로 시연한다.

## 진행 규칙

- Task 단위로 브랜치 없이 개인 브랜치(`N016_김규현`)에 커밋한다. 커밋 메시지에 Task ID를 남긴다. 예: `feat(server): 예약 트랜잭션 구현 (T-08)`
- 완료 기준(DoD)을 만족하면 체크하고, 새로 발견된 일은 Backlog에 먼저 적은 뒤 주차 계획에 편입한다.
- 화면 ID(W/M/C)는 visual-기획서의 와이어프레임을 그대로 따른다.

---

## 1주차 — 기반 + 사장님 축 (공급이 있어야 수요가 있다)

주간 목표 이슈: [#6](https://github.com/HappyGogildong/hub/issues/6)

- [x] **T-00 개발 환경 구성** — 모노레포(client/server/prototype), Vite 프록시, Prettier, 헬스체크
- [x] **T-01 DB 스키마 & 마이그레이션** `server` — [#1](https://github.com/HappyGogildong/hub/issues/1)
  - users, stores, favorites, deals, reservations (snake_case, 기획서 §4 데이터 모델)
  - DoD: 마이그레이션 SQL로 로컬 PostgreSQL에 스키마 재현 가능. `deals.remaining_qty >= 0` CHECK 제약 포함
- [x] **T-02 시딩 스크립트** `server` — [#2](https://github.com/HappyGogildong/hub/issues/2)
  - 데모용 가게 3곳 + 사용자 2명 + 활성 딜 (기획서 §7 콜드 스타트: 데모는 시딩으로)
  - DoD: `npm run seed -w server` 한 번으로 초기화
- [x] **T-03 역할 선택 진입 화면 (C0)** `client` — [#3](https://github.com/HappyGogildong/hub/issues/3)
  - 사장님/소비자 두 버튼. 로그인(C1)은 자리만 두고 미구현(범위 외)
  - DoD: 역할 선택 시 각 축의 첫 화면으로 라우팅
- [x] **T-04 가게 등록 API + 화면 (W1)** `server` `client` — [#4](https://github.com/HappyGogildong/hub/issues/4)
  - 상호·주소(좌표)·카테고리. 최초 1회, 등록돼 있으면 대시보드로
  - DoD: 등록한 좌표가 이후 거리 계산의 기준으로 조회됨
- [x] **T-05 딜 등록 API + 화면 (W2)** `server` `client` — [#5](https://github.com/HappyGogildong/hub/issues/5)
  - 상품명·카테고리·수량·원가/할인가·픽업 마감시간. 등록 30초 내 완료 가능한 UI
  - DoD: 등록 즉시 딜 목록 API에 노출, 알림 트리거 포인트(T-11) 주석으로 표시

## 2주차 — 소비자 축 + 선착순 예약 + 알림 판정 (핵심 루프 완성)

- [x] **T-06 딜 목록 API + 화면 (M2)** `server` `client` — [#7](https://github.com/HappyGogildong/hub/issues/7)
  - 사용자 기준 주소 기반 Haversine 거리 계산·정렬, 남은 수량·픽업 마감 표시. 지도는 리스트 우선(지도는 Backlog)
  - DoD: 반경 밖 딜이 목록에 나오지 않음
- [x] **T-07 딜 상세 화면 (M3)** `client` `server` — [#8](https://github.com/HappyGogildong/hub/issues/8)
  - 수량 스테퍼(최대 = 남은 수량), 가격·픽업 시간
- [x] **T-08 예약 API — 원자적 재고 차감** `server` ★기술 셀링포인트 — [#9](https://github.com/HappyGogildong/hub/issues/9)
  - `UPDATE deals SET remaining_qty = remaining_qty - $qty WHERE id = $id AND remaining_qty >= $qty` + 트랜잭션으로 reservations INSERT + 픽업코드 발급
  - DoD: 동시 요청 시 오버셀 0건(k6 검증은 T-14), 재고 부족 시 409 + `{ message }`
- [x] **T-09 픽업코드 화면 (M4) + 내 예약 목록** `client` — [#10](https://github.com/HappyGogildong/hub/issues/10)
  - 코드·상품·픽업 마감·가게 정보
- [x] **T-10 픽업 확인 API + 화면 (W4) / 대시보드 (W3)** `server` `client` — [#11](https://github.com/HappyGogildong/hub/issues/11)
  - 코드 검증 → 픽업 완료 처리. 대시보드는 남은 수량·예약 수를 폴링으로 갱신
  - DoD: 잘못된/처리된 코드 거부, 완료 시 대시보드 수치 반영
- [x] **T-11 알림 대상 판정 서비스** `server` — [#12](https://github.com/HappyGogildong/hub/issues/12)
  - 규칙(기획서 §3.2): (카테고리 매칭 OR 즐겨찾기 가게) AND 위치 조건(반경 N km / 항상)
  - 발송 채널(T-13)과 분리해 판정 로직만 먼저 완성 — 위치 쿼리(T-06)를 재사용
  - DoD: 딜 등록 시 대상 사용자 ID 목록 산출, 단위 시나리오로 경계(반경 밖/조건 불일치) 확인

## 3주차 — 알림 발송 + 증명 + 시연 준비

- [x] **T-12 관심 설정 (M1 + M5)** `server` `client` — [#13](https://github.com/HappyGogildong/hub/issues/13)
  - M1: 가게 검색·즐겨찾기 등록(초기 진입). M5: 관심 카테고리·위치 조건(N km 슬라이더/항상)
  - DoD: 설정 값이 T-11 판정에 반영됨
- [x] **T-13 FCM 푸시 + 인앱 알림** `server` `client` — [#15](https://github.com/HappyGogildong/hub/issues/15)
  - server: firebase-admin, 토큰 등록 API, 발송. client: Firebase JS SDK + 서비스 워커, 포그라운드 인앱 알림
  - 푸시 권한 거부 시 인앱 폴링 폴백. Firebase 자격증명은 server/.env (커밋 금지)
  - 선행 작업: Firebase 프로젝트 생성 + 서비스 계정 키 발급
  - DoD: 딜 등록 → 조건에 맞는 기기에서 푸시 수신
- [x] **T-14 만료 처리** `server` — [#14](https://github.com/HappyGogildong/hub/issues/14)
  - 픽업 마감 경과 시: 딜 비활성화 + 미픽업 예약 만료 + 재고 복원(확정 정책)
  - DoD: 마감 지난 딜이 목록에서 사라지고 예약 상태가 `expired`로 전이
- [ ] **T-15 k6 부하 테스트 — 오버셀 증명** `server` ★기술 셀링포인트
  - 락 미적용(비교용 브랜치/플래그) vs 적용 시나리오, "재고 3개에 동시 100 요청 → 정확히 3건 성공" 그래프
  - T-08 완료 직후부터 착수 가능 — 3주차 후반까지 미루지 않는다
  - DoD: 전후 비교 결과를 docs/에 기록
- [ ] **T-16 데모 시나리오 정리 + 폴리싱**
  - 시딩 → 등록 → 푸시 수신 → 경합 예약 → 픽업 확인까지 리허설 대본, UI 마감(DESIGN.md 토큰 준수)
- [x] **T-17 예약 발생 알림 (사장님)** `server` `client` — [#16](https://github.com/HappyGogildong/hub/issues/16)
  - 소비자가 예약하면 해당 가게 사장님에게 푸시 + 인앱 알림 (T-13 인프라 재사용)
  - 예약 트랜잭션 커밋 후 발송 — 알림 실패가 예약을 되돌리지 않는다
  - 안 읽은 알림 배지(서버 목록 기준)로 푸시를 놓쳐도 인지 가능
  - DoD: 예약 시 사장님 기기로 푸시 수신, 대시보드 자동 갱신
- [x] **T-18 사장님 대시보드 16:9 재구성** `client` — Backlog에서 승격
  - 기획(visual-기획서 §03 "가로형 웹 레이아웃")대로 카운터 PC 상시 화면에 맞게 재구성
  - 오늘 요약 타일·소진 진행률·마감 카운트다운·픽업 대기 목록·인라인 픽업 확인
  - 서버 신규 API 없이 딜·예약 응답 조합(lib/ownerStats) + 단위 테스트
  - DoD: 16:9에서 가로 스크롤 없음, 인라인 픽업 시 집계 즉시 갱신

---

## Backlog (MVP 이후 / 범위 외)

기획서 §5 Out of Scope 및 진행 중 발견 항목. 착수하려면 주차 계획으로 승격한다.

- Redis GeoSpatial 최적화 전후 비교 (구 T-17 — 3주 축소로 강등, 여유 시에만)
- 회원가입·로그인 구현 (C1 — 스키마는 [erd.md](./erd.md)에 반영 완료, API는 bcrypt + 세션/JWT 결정 필요. 시연은 시딩 사용자로도 가능)
- 지도 뷰 (M2의 지도/리스트 전환 — MVP는 리스트만)
- 앱 내 사전 결제 / PG 정산 / 환불
- 리뷰·평점, 사장님 정산 리포트
- PostGIS 전환 (MVP는 Haversine 쿼리)
- 노쇼 정책 고도화 (횟수 제한·페널티 — 현재는 단순 만료)
- 대시보드 실시간화 (폴링 → SSE/WebSocket)
- ESLint 도입, 서버 통합 테스트(supertest) 상시화 (클라이언트는 Vitest + RTL 도입됨 — RequireRole 테스트 작성)
- 이미지 업로드 (딜 사진 — MVP는 카테고리 아이콘/플레이스홀더로 대체)

## 미결/확인 필요

- Firebase 프로젝트 소유 계정 결정 (개인 계정 vs 팀 계정)
- 배포 환경(시연을 로컬로 할지, 간단 배포까지 갈지) — 4주차 초에 결정
