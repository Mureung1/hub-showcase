# OpenSeed Prototype Design System

## 디자인 방향

OpenSeed는 오픈소스형 사업화 아이디어 검증 플랫폼이다. 화면은 커뮤니티처럼 접근하기 쉽고, 가상 투자와 랭킹은 게임처럼 재미있으며, 기업이 검토할 때는 신뢰할 수 있는 정보 밀도를 제공해야 한다.

이번 디자인 시스템은 DACON의 랭킹/XP/대회 리스트형 정보 구조와 Linkareer의 공고 탐색형 탭/검색/카드 흐름을 참고했다. 따라서 어두운 대시보드형 분위기보다, 흰색 기반의 가벼운 서비스형 UI와 명확한 수치 비교를 우선한다.

## 핵심 원칙

1. 공개와 보호의 균형을 화면에서 명확히 보여준다.
2. 아이디어 자체보다 기여 기록, 성장 타임라인, 시장 반응을 더 중요한 자산으로 다룬다.
3. 랭킹과 가상 투자 지표는 즉시 읽히도록 리스트형 데이터와 작은 지표 칩으로 구성한다.
4. 기업 화면은 광고성보다 검토와 의사결정에 가까운 운영형 UI로 구성한다.
5. 사용자는 공고/대회 플랫폼을 탐색하듯 가볍게 아이디어를 둘러보고, 필요할 때 상세 지표로 들어간다.

## 컬러 토큰

| Token | Hex | Usage |
|---|---|---|
| Ink | #1F2937 | 본문 텍스트, 타이틀 |
| Signal Blue | #246BFE | 주요 액션, 활성 탭, 랭킹 강조 |
| Trust Green | #00A878 | 상승률, 공개/신뢰 신호 |
| Seed Orange | #FF9F1C | 사업성, 포인트, Business Ready |
| Alert Red | #EF4444 | 경고, 조작/리스크 상태 |
| Canvas | #F7F8FB | 전체 배경 |
| Line | #E5E8EF | 리스트 구분선과 입력 경계 |

## 레퍼런스 반영 포인트

- DACON: 랭킹, XP, 참여 수, 진행 중인 대회처럼 수치를 빠르게 비교하는 정보 밀도.
- Linkareer: 검색과 탭을 중심으로 여러 콘텐츠를 가볍게 탐색하는 채용/공고형 UX.
- OpenSeed 적용: 실시간 랭킹을 카드보다 리스트에 가깝게 배치하고, Seed Point/기업 관심/상승률을 작은 지표 칩으로 정리한다.

## 주요 페이지

- `00_design_system.png`: 디자인 시스템과 컴포넌트
- `01_main_ranking.png`: 실시간 아이디어 랭킹과 기여자 순위
- `02_create_flow.png`: AI 기반 아이디어 등록 플로우
- `03_idea_detail.png`: 아이디어 상세와 시장 반응 지표
- `04_contribution_timeline.png`: 기여자 기록과 성장 타임라인
- `05_company_dashboard.png`: 기업/투자자 대시보드

## MVP 개발 연결

이 프로토타입은 HTML/CSS/JS와 localStorage로 구성되어 있으며, 이후 React/Next.js 기준으로 컴포넌트화할 수 있다. 핵심 컴포넌트는 `TopNavigation`, `RankingRow`, `MetricChip`, `FeedbackCard`, `Timeline`, `MaturityBadge`, `PrivacySelector`, `CompanySignalCard`, `SeedWallet`로 분리하는 것을 권장한다.
