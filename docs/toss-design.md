# 프로토타입 디자인 가이드 — 토스(Toss) 디자인 시스템 참고

프로토타입(`docs/prototype.html`)에 적용한 디자인 토큰. 토스 특유의 "신뢰감 있는 미니멀함"을 참고해 우리 서비스(감정 정리 도구)에 맞게 골라 씀.

## 컬러
| 용도 | 값 |
|---|---|
| Primary (버튼/포인트) | `#3182f6` |
| Primary Hover/Pressed | `#2272eb` |
| Primary Light (배경) | `#e8f3ff` |
| Text 강조(제목) | `#191f28` |
| Text 본문 | `#4e5968` |
| Text 보조 | `#8b95a1` |
| Border | `#e5e8eb` |
| 배경(페이지) | `#f2f4f6` |
| 배경(카드) | `#ffffff` |
| Error | `#f04452` |

## 타이포그래피
- 폰트: `"Pretendard", -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif` (토스 전용 서체 Toss Product Sans는 라이선스 폰트라 웹 프로토타입엔 미포함, 대체 폰트로 톤만 참고)
- 제목(Heading): 20~22px / 700
- 본문(Body): 15~16px / 400~500
- 캡션(Caption): 13px / 400, 보조 텍스트 색상

## 레이아웃
- 모바일 앱 화면처럼 중앙 정렬 + `max-width: 430px` 카드형 컨테이너
- 카드/버튼 사이 여백은 8px 배수(8/12/16/20/24)로 통일 — "호흡 공간"으로 신뢰감 표현

## Shape & Elevation
- 버튼/입력창 radius: 16px, 카드 radius: 16~20px
- 카드 그림자: `0 2px 8px rgba(0,0,0,0.08)`

## 버튼
- Primary(Fill): 배경 `#3182f6`, 글자 `#fff`, radius 16px, height 56px, font 16px/600
- 비활성(Disabled): 배경 `#e5e8eb`, 글자 `#b0b8c1`
- Weak(보조 버튼, "다시 정리하기"): 배경 `#f2f4f6`, 글자 `#4e5968`

## 입력창
- 배경 `#f9fafb`, border `1px solid #e5e8eb`, radius 16px, padding 16px, focus 시 border `#3182f6`

## 참고 자료
- [Toss Design System — Colors, Typography & Tokens (oh-my-design.kr)](https://oh-my-design.kr/design-systems/toss)
- [토스 디자인 시스템(TDS) — 앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/design/components.html)
- [달리는 기차 바퀴 칠하기: 7년만의 컬러 시스템 업데이트 — Toss Tech](https://toss.tech/article/tds-color-system-update)
