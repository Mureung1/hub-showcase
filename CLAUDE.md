# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

로컬 마감 할인 매칭 플랫폼(가제: "마감할인" / "떨이") — 마감 임박 재고를 등록하면 근처 소비자에게 알림을 보내 예약·픽업으로 연결하는 양면 매칭 서비스. 부트캠프 과제 저장소로, 현재 단계의 산출물은 **기획 문서 + 인터랙티브 프로토타입**이며 실제 백엔드는 아직 없다.

작업 언어는 한국어다(문서, 커밋 메시지, UI 문자열 모두).

## 명령어

```bash
npm run dev      # Vite 개발 서버
npm run build    # 프로덕션 빌드 → dist/ (gitignore됨)
npm run preview  # 빌드 결과 미리보기
```

린트·테스트 설정은 없다.

`docs/` 하위 문서는 빌드 대상이 아니다 — `visual-기획서.html`은 독립 HTML 조각(doctype/head/body 없음)으로, 브라우저나 프리뷰 패널에서 바로 렌더링한다.

## 구조와 아키텍처

저장소는 세 층위로 구성된다:

1. **`docs/기획서.md`** — 기획의 원본(canonical spec). 문제 정의, 사용자 시나리오, 알림 타게팅 규칙, 데이터 모델(User/Store/Favorite/Deal/Reservation), MVP 범위가 여기 확정돼 있다. 화면·기능 관련 판단이 필요하면 이 문서를 먼저 따른다. 핵심 불변식: `Deal.남은수량 = 총수량 − Σ(활성 Reservation.수량) ≥ 0`.
2. **`docs/visual-기획서.html`** — 화면 흐름·화면 목록·와이어프레임 비주얼 기획서. 스타일은 전부 CSS 변수 토큰으로 구성되며 `prefers-color-scheme` + `data-theme` 속성으로 라이트/다크를 모두 지원한다.
3. **`src/`** — Vite + React 18 프로토타입. 라우터·백엔드·영속성 없이 핵심 루프만 시연한다.

### 프로토타입 상태 모델 (src/components/Prototype.jsx)

단일 파일에 도메인 전체가 들어 있다. 최상위 `Prototype` 컴포넌트가 `deals`, `reservations` 상태를 인메모리로 보유하고, 역할 전환 토글에 따라 두 UI에 상태+콜백을 내려준다:

- **`ConsumerApp`** (폰 프레임): 목록 → 상세 → 예약 → 픽업코드
- **`OwnerApp`** (웹 프레임): 대시보드 / 상품 등록 / 픽업 확인

도메인 로직은 최상위 콜백 세 개에 집중돼 있다: `reserve`(재고 검사 후 차감 + 픽업코드 발급 — 기획서의 "선착순 동시성"을 모델링), `addDeal`, `confirmPickup`(코드 검증 → `picked` 상태 전이). 프로토타입을 수정할 때 이 흐름(등록 → 예약·재고 차감 → 픽업코드 → 픽업 확인)을 깨지 않아야 한다. 결제는 의도적으로 앱 밖(현장결제)이다.

`src/components/ProjectIntro.jsx`는 이전 단계의 소개 페이지로, 현재 `App.jsx`에서는 사용되지 않는다.

## 디자인 기준

루트의 **`DESIGN.md`** 가 디자인 시안의 기준 문서다(Toss TDS 토큰 정리본). `docs/visual-기획서.html`의 시안은 이 토큰을 따른다:

- 주 인터랙션/소비자 색: Toss Blue `#3182f6` (다크: `#5a9df8`), 사장님 역할 색: Info Teal `#18a5a5`
- grey 스케일(`#191f28`/`#4e5968`/`#8b95a1`/`#e5e8eb`), 라운드 8/12/16px, 단일 레이어 저투명 블랙 섀도
- 숫자(가격·수량)는 `tabular-nums` + 700 웨이트
- 디자인 문서에는 이모지 금지(No Emojis 정책) — 텍스트 태그나 아이콘으로 대체

DESIGN.md는 현재 git 미추적 파일이므로 삭제하지 않도록 주의한다.

## Git / PR 규칙

- 개인 작업 브랜치(`N016_김규현`)에서 작업한다. PR 타이틀 형식: `[루카스아이디_실명] 한 문장 요약` (예: `[N016_김규현] 주문정보 페이지 개발`).
- PR 본문은 `.github/pull_request_template.md`의 섹션(주요 작업 리스트 / 내가 설명할 수 있는 부분 / 아직 이해 못 한 부분 / 새로 알게 된 것)을 채우고 라벨을 지정한다.
- **자동 머지 워크플로우**(`.github/workflows/auto-merge.yml`)가 매일 13:00 UTC(22:00 KST)에 열린 PR을 일괄 처리한다: main 타겟 PR은 스킵, `review` 라벨은 스킵, 변경 요청 상태는 연기, **충돌 상태 PR은 자동으로 close되므로** PR을 열어둔 채 충돌을 방치하지 않는다.
