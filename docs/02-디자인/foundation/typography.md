# 타이포그래피 (Typography)

폰트는 **Pretendard**를 사용해요. (한글·영문·숫자 모두 지원하는 오픈 폰트로, 미니멀 핀테크 톤에 맞아요.)
크기와 라인 높이는 아래 토큰으로만 참조하고 직접 하드코딩하지 않아요. 값을 고정하면 사용자의 "더 큰 텍스트" 접근성 설정에 유연하게 대응하기 어려워요.

## 타입 스케일

| 토큰 | Size / Line height | 기본 굵기 | 용도 |
|---|---|---|---|
| Typography 1 | 30 / 40 | Bold | 매우 큰 제목 (온보딩 타이틀) |
| Typography 2 | 26 / 35 | Bold | 큰 제목 (페이지 헤드라인) |
| Typography 3 | 22 / 31 | Semibold | 일반 제목 (섹션 타이틀) |
| Typography 4 | 20 / 29 | Semibold | 작은 제목 (카드 타이틀) |
| Typography 5 | 17 / 25.5 | Regular | 일반 본문 (기본 읽기 텍스트) |
| Typography 6 | 15 / 22.5 | Regular | 작은 본문 (보조 설명) |
| Typography 7 | 13 / 19.5 | Regular | 캡션 (라벨, 메타 정보) |

> 중간 단계가 필요하면 `subTypography 1~13`(29~11px)을 사용해요. 사용하는 입장에서 구체적인 px를 외울 필요 없이, 계층화된 토큰을 그대로 쓰도록 추상화돼 있어요.

## 굵기 (Weight)

| 이름 | 값 | 용도 |
|---|---|---|
| Regular | 400 | 본문 |
| Medium | 500 | 살짝 강조된 라벨 |
| Semibold | 600 | 제목, 버튼 텍스트 |
| Bold | 700 | 큰 제목, 금액 강조 |

## 사용 규칙

- 한 화면의 제목 계층은 최대 3단계까지만 써요.
- 본문 최소 크기는 **15px** — 그 이하(13px)는 캡션·메타 정보에만 사용해요.
- 숫자(금액)는 `Bold`로 강조하되, 통화 단위(`원`)는 같은 크기로 붙여 써요.
- 자간(letter-spacing)은 제목에서 `-0.02em` 정도로 살짝 좁혀 조밀하게 보여요.

## 더 큰 텍스트 (접근성)

iOS·Android의 "더 큰 텍스트" 설정은 앱 내부 웹뷰에도 동일하게 적용돼야 해요.
비율(100%·110%·120%·135%·160%…)에 따라 실제 폰트 크기가 동적으로 커지도록 상대 단위/토큰으로 구현하고, px를 고정하지 않아요.

- **iOS**: xLarge·xxLarge·xxxLarge·A11y 단계를 비율로 추상화해서 사용
- **Android**: `기준크기 × 비율(NN) × 0.01` 공식으로 계산 (단계 제한 없음)

## CSS 예시

```css
:root {
  --font-family: 'Pretendard', -apple-system, system-ui, sans-serif;
}
/* Typography 3 — 일반 제목 */
.title-3 { font-size: 22px; line-height: 31px; font-weight: 600; letter-spacing: -0.02em; }
/* Typography 5 — 일반 본문 */
.body-1 { font-size: 17px; line-height: 25.5px; font-weight: 400; }
```
