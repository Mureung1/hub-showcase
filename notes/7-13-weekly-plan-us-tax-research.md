# 7/13 주간 계획 + 미국 영주권자 × 한국 개인사업자 세금 리서치

> 작성일: 2026-07-13. 이번주 방향 브레인스토밍 결과(배포·수익화 먼저)와,
> 개인사업자 등록 전 확인 요청한 미국 세법 리서치를 함께 정리한 문서.

## 1. 미국 영주권자 + 한국 개인사업자 세금 리서치

### 기본 구조

- 영주권자는 거주지와 무관하게 **전세계 소득을 미국에 신고**해야 함 (Form 1040).
  자영업 순소득이 **연 $400만 넘어도** 신고 의무 발생.
- 한국 개인사업자는 미국 세법상 sole proprietorship →
  **Schedule C**(사업 손익) + **Schedule SE**(자영업세)로 보고.
  법인이 아니므로 Form 5471 같은 무거운 보고는 없음.

### 소득세는 대부분 피할 수 있음

- **FEIE (해외근로소득 제외, Form 2555)**: 2025년 기준 **$130,000까지 제외**
  (2026년 $132,900). 초기 사이드 프로젝트 수익 수준에서는 미국 소득세 사실상 0.
  - 한국 국적 + 한미 조세조약국 거주 → **bona fide residence test** 사용 가능.
    (아니면 12개월 중 330일 해외 체류의 physical presence test.)
- 대안: 한국에 낸 세금을 공제받는 Foreign Tax Credit (Form 1116).

### 진짜 함정: 자영업세(SE tax) 15.3%

- FEIE는 소득세만 줄이고 **SE tax는 못 줄임**.
- 그러나 **한미 사회보장협정(totalization agreement)** 으로 면제 가능:
  한국 국민연금 가입 상태에서 국민연금공단에서 **certificate of coverage** 발급 →
  미국 신고서에 첨부 (종이 신고 필요).
- 개인사업자 등록 시 국민연금 지역가입자가 되므로, 이 서류만 챙기면 15.3% 전액 면제.

### 놓치면 벌금 큰 3가지

1. **Form 8858** — 해외에서 별도 장부를 두고 사업하면 "foreign branch"로 보고 의무가
   생길 수 있음. 미제출 시 **연 $10,000 벌금**. 개인사업자 등록하면 사실상 해당된다고
   보고 준비하는 게 안전.
2. **FBAR (FinCEN 114)** — 해외(한국) 계좌 합산 잔액이 연중 한 번이라도 $10,000 초과
   시 신고. 사업용 계좌를 만들면 더 쉽게 걸림.
3. **FATCA (Form 8938)** — 해외 자산이 기준액(해외 거주 single 기준 연말 $200k /
   연중 $300k) 초과 시 신고. 당장은 해당 안 될 가능성 높음.

### 결론

- **등록 자체가 미국 세금을 새로 만들지는 않음** — 소득이 생기면 어차피 보고 대상이고,
  늘어나는 것은 서류(8858, FBAR, 국민연금 커버리지 증명).
- 다만 **수익이 검증되기 전에는 서두를 이유 없음** → 이번주는 사업자 없이 가능한
  수익화 레일(광고 심사 신청 + 토스페이먼츠 테스트 모드)부터 깐다.
- 세금과 별개로, 한국 장기 거주 자체가 **영주권 유지(abandonment) 이슈**가 될 수 있음
  — 이민법 쪽에서 별도 확인 필요 (re-entry permit 등).

### 출처

- https://www.myexpattaxes.com/expat-tax-tips/country-guides/filing-us-taxes-korea-expats/
- https://www.myexpattaxes.com/expat-tax-tips/self-employment/self-employment-taxes-americans-abroad-expat/
- https://www.irs.gov/individuals/international-taxpayers/self-employment-tax-for-businesses-abroad
- https://www.irs.gov/forms-pubs/about-form-8858
- https://brighttax.com/blog/form-8858-and-foreign-disregarded-entities/
- https://www.irs.gov/individuals/international-taxpayers/foreign-earned-income-exclusion-bona-fide-residence-test
- https://www.taxesforexpats.com/articles/expat-tax-rules/green-card-foreign-income-tax.html

## 2. 수익화 경로 현실 체크 (한국 개인 기준)

| 경로 | 개인 가능? | 비고 |
|---|---|---|
| 광고 (애드센스/카카오 애드핏) | O | 실수익 가능. 심사 수일~수주 → 먼저 신청해놔야 함 |
| Gumroad / Lemon Squeezy (MoR) | O | 개인 자격으로 실카드결제 받는 사실상 유일한 정식 루트. 국내 UX는 나쁨 |
| 토스페이먼츠 정식 연동 | X (사업자 필요) | 개인사업자(간이과세자)는 홈택스에서 본인이 무료 등록 가능 |
| 토스페이먼츠 테스트 모드 | O | 결제창 UI/플로우 구현·시연 가능, 실돈은 안 오감 |
| Chrome Web Store 유료 확장 | 폐지됨 | 스토어 자체 결제 기능은 종료 → 외부 결제 필요 |

## 3. 이번주 계획 (7/13~7/19): 배포·수익화 먼저

### Track 1 (메인): 홈택스 가이드 확장 — 완성 + Chrome Web Store 배포

핵심 파일: `hometax-guide-extension/manifest.json`, `content-script.js`,
`background.js`, `server/server.mjs`

1. **메인기능 60% → 100%**: 환급금 조회 가이드 플로우 끝까지 안정화.
   기존 스파이크 지식 재활용 — WebSquare 동적 id 대신 role/텍스트 매칭, 오버레이 시
   `document.elementFromPoint` topmost 검증 (`tax-agent/tax-agent-research.md` §1-3/§1-6).
2. **서버 배포**: `server/server.mjs`(Anthropic 프록시, stateless)를 무료 티어
   클라우드(Render/Fly/Railway 중 택1)에 배포. `manifest.json`의
   `http://localhost:4000/*` host_permission을 배포 URL로 교체.
   **남용 방지 필수**: rate limit + 오리진 체크 (API 비용 보호).
   `usage-log.jsonl` 파일 로깅은 배포 환경에 맞게 조정.
3. **스토어 제출**: 아이콘/스크린샷/설명 + 개인정보처리방침 페이지(호스팅 필요 —
   hometax host permission 때문에 심사에서 요구) + 개발자 등록($5).
   **월~화 제출 목표** (심사 수일 소요 → 이게 최우선 크리티컬 패스).
4. **결제 플로우**: 프리미엄 기능 잠금 + 토스페이먼츠 테스트 모드 결제창 연동.
   사업자 등록 후 실키로 전환.

### Track 2: armygo 수익화 (병무청 결과 확인 후, 화요일~)

- **애드센스 신청을 이번주 초에** — 심사가 오래 걸려서 먼저 걸어놔야 함.
  armygo(github.io)에 광고 코드 + 필수 페이지(개인정보처리방침 등) 추가.
- UI 개선(리액트, 토스식 한 화면 한 입력)은 후보 1로 armygo 레포에서 병행.

### Track 3 (서브): 회계 장부 자동화 agent — 기획 스파이크만

- `IDEA.MD`의 서식 목록(법인세 세무조정계산서/결산보고서 ~40종)은 풀스코프로 수 주짜리
  → **MVP 슬라이스 정의 문서**만 작성: 어떤 입력(시산표? 거래내역?)에서 어떤 서식
  1~2종을 먼저 자동 생성할지, 경쟁(더존/세무사랑) 대비 포지션, 무료+광고 모델 타당성.
- 이번주 산출물은 기획 md 1개, 코드 없음.

### 운영 규칙 (이 레포)

- 매일 PR — 제목 `[루카스아이디_실명] - 한 문장 요약`, 템플릿 3개 섹션 준수.
  auto-merge 봇: 충돌 PR은 자동 close되니 주의.
- 루트 `.env` 절대 git add 금지. 확장 서버 API 키는 배포 플랫폼 환경변수로만.

### 완료 검증

- 확장: localhost 없이(배포 서버로) 홈택스에서 환급금 조회 가이드가 끝까지 동작 →
  스토어 제출 접수 확인.
- 결제: 테스트 모드 결제 완료 → 프리미엄 잠금 해제 플로우 확인.
- armygo: 애드센스 "검토 중" 상태 진입 확인.
