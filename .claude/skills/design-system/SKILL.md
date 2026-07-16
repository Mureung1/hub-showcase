---
name: design-system
description: Use when creating or editing PPT slides (docs/wiki/presentations.md), diagrams (User Flow / Screen Flow), or prototype HTML pages (docs/prototype/) for the 콕 project, or when reviewing any of these for visual consistency. Read design.md in this folder for the full color/font/component spec and known gotchas before writing CSS or generating new visuals.
---

# 콕 디자인 시스템 스킬

이 저장소(`connect-AIAgentChallenge-26-1/hub`, 프로젝트명 "콕")의 모든 시각 자료는 하나의 디자인 언어를 공유합니다. 새 슬라이드, 다이어그램, 프로토타입 화면을 만들거나 기존 것을 수정하기 전에 **`design.md`를 반드시 읽고** 아래 원칙을 따르세요.

## 언제 이 스킬을 쓰나
- `docs/wiki/presentations.md`(발표 자료, 주차별 슬라이드)용 슬라이드 이미지를 새로 만들거나 수정할 때
- User Flow / Screen Flow 같은 다이어그램을 만들거나 수정할 때
- `docs/prototype/*.html` 목업을 만들거나 수정할 때
- 위 산출물들의 시각적 일관성을 검토할 때 (폰트, 색상, 도형 스타일이 기존 산출물과 맞는지)

## 핵심 규칙 (요약 — 자세한 내용은 design.md)
1. 핵심 UI(버튼, 배경, 본문 텍스트 등)는 `design.md`의 기본 토큰만 쓴다. 단, 화이트노이즈 테마처럼 **기능 자체가 새로운 색 팔레트를 요구하면 새 토큰을 추가해도 된다** — 대신 기존 팔레트와 같은 톤(채도 낮은 더스티 파스텔, 웜 뉴트럴 베이스)을 유지하고, `--forest`/`-line`/`-deep`처럼 이름에 테마를 붙이고 새로 만든 토큰을 `design.md`에도 추가해둔다. 막아야 하는 건 "새 색 추가"가 아니라 "톤에서 벗어난 쨍하고 채도 높은 색".
2. 제목(H1)에 Gowun Batang을 쓸 때는 **영문/숫자를 섞지 않는다** — 폰트 폴백으로 그 글자만 다른 서체로 렌더링되는 버그가 반복적으로 발생했다.
3. 다이어그램은 ANSI 순서도 기호 규칙(oval/rect/parallelogram/diamond)과 검정 elbow 커넥터를 따른다.
4. Puppeteer로 스크린샷을 찍을 때는 `document.fonts.load(...)` + `document.fonts.check(...)`로 웹폰트 로딩을 명시적으로 확인한 뒤 캡처한다 (개별 페이지 로드마다 폰트 로딩 레이스가 발생해 다른 서체로 폴백된 적이 있었다).
5. 기획서 슬라이드 HTML 소스와 캡처 스크립트는 **반드시 `.local/plan-slides/`(이 저장소 루트, `.gitignore`에 등록되어 커밋되지 않음)에 저장해둔다.** 스크래치패드 등 임시 폴더에만 두면 세션이 바뀔 때 사라져서 나중에 수정이 필요할 때 처음부터 다시 만들어야 한다 — 실제로 `slides.html` 원본이 이렇게 유실된 적이 있다. 다른 종류의 산출물(예: 다이어그램 전용 작업)이 생기면 `.local/` 아래 별도 폴더(`.local/diagrams/` 등)를 목적에 맞게 새로 만든다.
