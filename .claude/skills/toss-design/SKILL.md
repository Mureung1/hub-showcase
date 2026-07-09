---
name: toss-design
description: Apply this project's Toss-inspired design tone (docs/toss-design.md) when building or reviewing any hub/ screen or component. Use when the user asks for a new screen "in our design tone / 우리 디자인 톤으로" or wants a design checked against the project's style.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
---

# 하루 체크아웃 디자인 톤 (Toss 참고)

`mental-health-tone`(연습용 스킬, naveragentai 루트)과 같은 패턴을 이 프로젝트에 적용한 것.
비교 결과 이 서비스엔 Toss 톤(신뢰감/미니멀)이 더 맞다고 판단해서 실제 프로젝트에 적용한다.

## 0. 토큰 소스는 항상 `docs/toss-design.md`

값을 하드코딩하지 않는다. 새 화면을 만들거나 검토하기 전에 `docs/toss-design.md`를 먼저 Read해서
현재 값을 확인한다. 참고 구현: `docs/prototype.html`(S1/S2), `docs/design-system/screen-calendar.html`(S3).

## 1. 생성 시 컴포넌트 레시피

- 레이아웃: `.phone`(max-width 430px) 안에 `.screen`(흰 카드, radius 20px, `0 2px 8px rgba(0,0,0,0.08)`) 하나.
- 폰트: Pretendard 계열. 제목 20~22px/700, 본문 15~16px/400~500, 캡션 13px.
- Primary 버튼: `#3182f6`, radius 16px, height 56px, font 16px/600. Weak 버튼은 배경 `#f2f4f6`.
- 입력창: 배경 `#f9fafb`, border `#e5e8eb`, radius 16px, focus 시 border `#3182f6`.
- 간격은 8px 배수(8/12/16/20/24)만 사용.

## 2. 검증 시 체크리스트 (디자인 결과물이 의도와 맞는지 확인)

- [ ] 토큰에 없는 색상/폰트/radius 값을 새로 쓰지 않았는가
- [ ] 간격이 8px 배수인가
- [ ] 감정을 다루는 화면인데 과하게 화려하거나 유쾌한 톤으로 새지 않았는가 (Toss의 "차분한 신뢰감" 유지)

> 지금은 기획서+프로토타입(정적 HTML mock) 단계라 위 항목은 순수 시각 디자인만 다룬다.
> 2주차에 실제 React 화면(client/src/pages)을 만들 때는 UI 문구가 AI 역할 제한 원칙
> (조언·진단·위로 금지, CLAUDE.md 참고)을 지키는지도 별도로 검토할 것 — 그건 콘텐츠/카피
> 검토라 이 디자인 체크리스트와는 성격이 다르므로 그때 가서 항목을 분리해 추가한다.

마음에 안 드는 결과가 나오면 값을 이 스킬 파일에 바로 고치지 말고, 항상 `docs/toss-design.md`를 고친 뒤
이 스킬로 다시 생성/검증한다 — 원본이 한 곳에만 있어야 다음 화면에도 일관되게 반영된다.
