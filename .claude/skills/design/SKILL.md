---
name: design
description: Visual design/UI conventions for "We should do..". Read before styling or building any screen/component under src/. Product/planning rules live in the dev-planning skill instead.
---

# 디자인 유의사항

## 먼저 확인
- 컬러 · 폰트 스펙 원본: @서비스 기획서.md (§1.7)
- 실제 컬러 토큰: `src/components/scheduler.css:1-11`의 `--scheduler-*` 변수 — 기획서 hex값과 완전히 일치하지 않음. 새 작업은 기존 변수를 그대로 쓰고, 통일 작업은 명시적으로 요청받았을 때만.
- 폰트: `Galmuri11`/`GalmuriMono11`을 jsDelivr CDN(`galmuri` npm 패키지, `index.html`에 `<link>`)으로 연결해 적용함. 기본은 Galmuri11, 영문 킥커 라벨·시간 표시는 GalmuriMono11, 긴 본문/설명(`.myhome-message`, `.category-settings > p`, `.empty-agenda`, `.profile-card p`, `.scheduler-notice`)은 가독성 때문에 Pretendard 유지. 새 긴 문장 텍스트를 추가하면 이 Pretendard 예외 목록에 셀렉터를 추가할 것.
- `src/styles.css`, `src/components/DodoDiary.tsx`는 `App.tsx`에서 렌더링되지 않는 죽은 데모 코드. 참고 금지.

## 그래픽 스타일 레퍼런스
- @.claude/reference/il_1588xN.5691421464_2zyz.webp, @.claude/reference/tumblr_744b2edcf81be41700cf5c47310428d9_ab54c882_640.webp
- 가져올 것: 저해상도 도트 그래픽 느낌 — 촘촘한 픽셀 격자로 만든 계단형 곡선, 모든 형태를 두르는 일정 두께의 진한 외곽선(스트로크), 픽셀 단위 명암(하이라이트/셰이딩 블록).
- 가져오지 않을 것: 레퍼런스의 색감(핑크/퍼블). 컬러는 항상 기존 `--scheduler-*` 팔레트를 그대로 쓴다.
- 외곽선 적용됨: `.scheduler-logo`, `.scheduler-avatar`, `.category-filter-icon`, `.group-pixel-icon`, `.home-dodo-leg`에 `filter: drop-shadow(...)` 4방향 오프셋으로 ink색 외곽선을 둘렀음(`scheduler.css`). 레퍼런스만큼 두껍게 보이도록 34~48px 아이콘은 4px, 큰 다리 파츠는 6px, 두두 몸통은 8px 오프셋을 쓴다. 노치형 아이콘을 새로 만들 때 같은 두께 기준(아이콘류 4px)을 따를 것 — `box-shadow`가 아니라 `filter: drop-shadow`를 써야 `clip-path`로 잘린 모양의 실루엣을 따라 외곽선이 그려진다.

## 도트/픽셀 비주얼 규칙
- `border-radius` 대신 `clip-path: polygon(...)`로 계단형 노치. 참고: `scheduler.css`의 `.scheduler-logo`, `.scheduler-avatar`.
- 그림자는 블러 대신 하드엣지 오프셋(`box-shadow: 8px 8px 0 …`). 픽셀 요소에만 적용, 일반 카드는 소프트 섀도 유지.
- 배경/카드는 단색 파스텔. 그라데이션 금지.
- 캐릭터/아바타 마크는 새로 그리지 말고 `shared.tsx`의 `PixelAvatar`/`CategoryIcon` 재사용.

## 화면 상태
- 완성(레퍼런스로 사용): 캘린더(`CalendarView.tsx`), 두두 마이홈(`StaticViews.tsx`의 `MyHomeView`) — @docs/prototype-preview.png, @docs/myhome-preview.png
- 미완성: 친구(`FriendsView`) · 마이페이지(`ProfileView`) — 기능은 있으나 카드/버튼이 평범한 `border-radius`. "디자인 마무리" 요청 시 여기가 대상.

## 파일 위치
- 전체 스타일: `src/components/scheduler.css` (단일 스타일시트)
- 화면: `src/components/scheduler/CalendarView.tsx`, `StaticViews.tsx`
- 공용 픽셀 파츠: `src/components/scheduler/shared.tsx`

## 하지 말 것
- 레퍼런스 이미지의 핑크/퍼플 색감을 그대로 가져오기 — 그래픽 렌더링 방식만 참고, 컬러는 기존 팔레트 고정.
- 새 컴포넌트에 `border-radius` + 블러 섀도 조합 쓰기.
- `styles.css`/`DodoDiary.tsx` 패턴 복사.
- 기획서 hex값으로 임의로 CSS 변수 덮어쓰기(명시적 요청 없이).
- 그라데이션 배경 추가.

---
이 초안은 시작점입니다. 실제 작업하면서 규칙이 안 맞으면 프로젝트에 맞게 고쳐 쓰세요.
