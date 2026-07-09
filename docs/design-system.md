# 진로 에이전트 프로토타입 — 디자인 시스템

> 기준 화면: Claude design에서 작업한 A안(카페형) 확정 목업
> 목적: React 구현 시 개발 Agent가 참고할 색상/타이포/컴포넌트 스타일 규칙 정리

---

## 1. 디자인 컨셉 요약

- **컨셉**: 네이버 계열 서비스(카페/블로그/시리즈)의 톤을 참고한 "차분하고 실용적인" 카드형 UI.
- **주조색**: 네이버 그린(`#03C75A`)을 CTA·강조 요소에, 네이버 스포츠 느낌의 블루(`#1B64DA`)를 보조 정보(마감일, AI 분석 등)에 사용.
- **레이아웃**: 흰 배경 카드 + 옅은 회색 페이지 배경. 모서리를 넉넉히 둥글리고(12~20px), 그림자는 아주 옅게(퍼짐 큰 soft shadow) 사용해 무게감 없이 부드럽게.
- **타이포**: Pretendard. 헤딩은 볼드(700), 라벨/강조 텍스트는 세미볼드(600), 본문은 레귤러(400).
- **톤앤매너**: 정보성 문구는 짧고 담백하게, 추천/분석 근거는 옅은 색 배경 박스로 구분해 "AI가 이유를 설명해준다"는 느낌을 강조.
- **에러/경고만 예외적으로 레드**(`#E0344A`) 사용 — 브랜드 컬러(그린/블루)와 구분되는 시맨틱 컬러로만 한정.

---

## 2. 색상

### 주요 색상 (Primary — Naver Green)
| 용도 | 색상 |
|---|---|
| Primary (CTA, 활성 상태, 브랜드 강조) | `#03C75A` |
| Primary Hover/Active | `#00A94E` |
| Primary Tint 배경 (배지/박스) | `#E9FAF0` |
| Primary Tint 테두리 (점선 버튼 등) | `#A6E6C1` |
| Primary Tint 텍스트 (그린 박스 위 텍스트) | `#2F5F43` |

### 보조 색상 (Accent — Sports Blue)
| 용도 | 색상 |
|---|---|
| Accent (마감일 배지, 링크 포인트, AI 분석 라벨) | `#1B64DA` |
| Accent Tint 배경 | `#EAF1FD` |
| Accent Tint 텍스트 | `#2F5F92` |

### 배경 색상
| 용도 | 색상 |
|---|---|
| 페이지 배경 | `#EDEFEF` |
| 카드/표면 배경 | `#FFFFFF` |
| 서브틀 배경(추천이유 요약 박스 등) | `#F5F7F5` |
| 입력창 배경 | `#FFFFFF` |
| textarea 배경 | `#FBFCFB` |
| 뉴트럴 칩/삭제버튼 배경 | `#F1F3F1` |

### 텍스트 색상
| 용도 | 색상 |
|---|---|
| 본문/제목 (기본) | `#1A2620` |
| 보조 텍스트(subtitle, muted) | `#6B7A72` |
| 3차 텍스트(기관명, 캡션) | `#8B968F` |
| placeholder/부가 안내 | `#9AA39C` |
| 에러 | `#E0344A` |

---

## 3. 버튼 스타일

**Primary 버튼** (추천받기, 저장/완료, 자소서 초안 생성)
- 배경 `#03C75A`, 텍스트 `#FFFFFF`, `font-weight: 700`
- `border: none`, `border-radius: 14px` (풀와이드 CTA) / `12px` (인라인 버튼)
- 크기: 풀와이드는 `padding: 14px 20px`, `font-size: 16px` / 인라인은 `padding: 12px 22px`, `font-size: 15px`
- **로딩/비활성 상태**: 배경만 옅은 그린(`#BFE8D0`)으로 톤다운, 텍스트는 흰색 유지, 라벨 텍스트를 "…하고 있어요" 형태로 교체 (버튼 자체는 숨기지 않고 상태만 변경)

**Ghost/Dashed 버튼** (자격증 추가처럼 목록에 항목을 더하는 액션)
- 배경 `#E9FAF0`, 텍스트 `#03C75A`, `border: 1px dashed #A6E6C1`
- `border-radius: 8px`, `padding: 6px 12px`, `font-size: 13px`

**아이콘/삭제 버튼** (자격증 입력 행의 × 버튼)
- 배경 `#F1F3F1`, 텍스트 `#6B7A72`, `border: none`, `border-radius: 10px`, 정사각형에 가까운 고정폭(약 40px)

**텍스트 링크형 액션** (목록으로, 다른 공고 보러 돌아가기)
- 배경 없음, 텍스트 `#6B7A72`, `font-size: 14px`, hover 시 `#00A94E`

---

## 4. 입력창 스타일

- 공통: `width: 100%`, `box-sizing: border-box`, `padding: 10px 14px`, `font-size: 15px`, `border-radius: 10px`, 배경 `#FFFFFF`, 텍스트 `#1A2620`
- 기본 테두리: `1px solid #D8DDD8`
- **에러 상태**: 테두리만 `1px solid #E0344A`로 교체 (배경/텍스트색은 변경하지 않음), 입력창 아래 `13px`, `#E0344A` 에러 문구 추가
- textarea: 위 규칙 + `min-height: 90~110px`, `resize: vertical`, 배경은 `#FBFCFB`(자소서 초안 화면) 또는 `#FFFFFF`(정보입력 화면)
- label: `font-size: 14px`, `font-weight: 600`, `color: #1A2620`, 필수 표시는 `*필수`를 `#E0344A`로, 선택 표시는 `(선택)`을 `#9AA39C`로 병기

---

## 5. 카드 / 박스 스타일

| 컴포넌트 | 배경 | radius | shadow/border | padding |
|---|---|---|---|---|
| 메인 카드 (정보입력, 공고상세) | `#FFFFFF` | `20px` | `0 12px 32px rgba(20,40,30,0.06)` | `36px` / `32px` |
| 자소서 문항 카드 | `#FFFFFF` | `16px` | `0 12px 32px rgba(20,40,30,0.05)` | `22px 24px` |
| 공고 리스트 카드 | `#FFFFFF` | `16px` | `border: 1px solid #E3E6E3` (그림자 없음) | `20px 22px` |
| 배지/태그 (카테고리, 마감일) | 그린 `#E9FAF0` / 블루 `#EAF1FD` | `999px` (pill) | 없음 | `3px 10px` |
| 인용/요약 박스 (추천이유, AI 분석) | 그린 또는 블루 tint | `10~12px` | 없음 | `10~16px` |

카드 그림자는 항상 **그린 계열의 옅은 톤**(`rgba(20,40,30,…)`)을 사용해 채도 있는 회색보다 따뜻한 느낌을 줌.

---

## 6. 단계 표시 (Stepper) 스타일

4단계 텍스트 스텝퍼(정보입력 → 추천목록 → 공고상세 → 자소서초안), `<ul>` 안 균등폭 `<li>`.

- **비활성 스텝**: 텍스트 `#8B968F`, `font-size: 13px`, 하단 보더 `3px solid #E3E6E3`, 번호 원(`20x20px`) 배경 `#E3E6E3` 텍스트 `#6B7A72`
- **활성 스텝**: 텍스트 `#03C75A`, `font-weight: 700`, 하단 보더 `3px solid #03C75A`, 번호 원 배경 `#03C75A` 텍스트 흰색
- 모든 스텝은 클릭 가능(자유 이동) — 프로토타입 리뷰 편의를 위함이며, 실제 서비스에서는 이전 단계까지만 허용하도록 조정 권장

---

## 7. 폰트 크기 / 굵기 규칙

| 레벨 | 크기 | 굵기 | 용도 |
|---|---|---|---|
| Display | 26px | 700 | 정보입력 화면 메인 타이틀 |
| H1 | 24px | 700 | 목록/상세/초안 화면 타이틀 |
| H2 | 15px | 400(제목은 굵게 표기 시 700) | 섹션 소제목(추천 이유, 주요 조건) |
| Body | 15px | 400 | 인풋 텍스트, 서브타이틀 |
| Body sm | 14px | 400/600 | 라벨, 리스트 텍스트 |
| Caption | 13px | 400 | 보조 설명, 에러 문구, 링크 |
| Badge | 12px | 700 | 카테고리/마감일 배지 |
| Button lg | 16px | 700 | 풀와이드 Primary 버튼 |
| Button md | 15px | 700 | 인라인 버튼 |
| Eyebrow (STEP 1) | 13px | 700 | 색상 포인트 라벨 |

폰트 패밀리: `Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif`

---

## 8. 여백(Spacing) 규칙

- 컨테이너: `max-width: 720px`, 좌우 `20px`, 상단 `28px`, 하단 `100px`(스크롤 여유)
- 카드 내부 패딩: 큰 카드 `36px` / `32px`, 문항 카드 `22px 24px`, 리스트 카드 `20px 22px`
- 폼 필드 간 세로 간격: `18px` (`margin-bottom`)
- 라벨-인풋 간격: `6px`
- 리스트 카드 간 간격: `14px` (정보입력 화면), `10px`(밀도 높은 리스트가 필요할 때)
- 배지/태그 그룹 내부 gap: `8px`
- 버튼 상단 여백: `22~28px` (섹션 마지막 CTA 앞)

4px 단위 스케일 사용 권장: `4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 28 · 32 · 36`

---

## 9. border-radius / border / shadow 규칙

- **radius 스케일**: `8px`(작은 칩) · `10px`(인풋/작은 박스) · `12px`(인라인 버튼) · `14px`(풀와이드 버튼) · `16px`(중간 카드) · `20px`(메인 카드) · `999px`(pill 배지)
- **border**: 뉴트럴 구분선은 `#E3E6E3`(실선) 또는 `#E3E6E3` 점선(`meta-list` 항목 구분), 인풋 기본 테두리는 `#D8DDD8`
- **shadow**: 카드에만 사용, 그린 톤 다크(`rgba(20,40,30, 0.05~0.06)`), 블러 `32px`, y축 오프셋 `12px`. 리스트 카드처럼 밀도 높은 영역은 그림자 대신 `1px solid` 보더만 사용해 화면이 무거워지지 않게 함.

---

## 10. CSS 변수 (`:root`)

`variables.css` 파일 참고 (아래 섹션에 전체 포함).

---

## 11. 개발자 참고용 컴포넌트 매핑 (React)

| 화면 요소 | 제안 컴포넌트명 | 비고 |
|---|---|---|
| 4단계 스텝퍼 | `<Stepper steps={[...]} activeIndex={n} onStepClick={} />` | 클릭 가능 여부는 `disabled` prop으로 제어 |
| 메인 카드 래퍼 | `<Card variant="lg\|md\|list">` | variant별 radius/padding/shadow 프리셋 매핑 |
| 배지 | `<Tag color="primary\|accent">{children}</Tag>` | 배지 색은 이 두 값만 사용 |
| 인용/요약 박스 | `<InfoBox tone="primary\|accent">{children}</InfoBox>` | 추천이유=primary, AI분석=accent |
| 버튼 | `<Button variant="primary\|ghost\|icon\|link" loading={bool}>` | loading 시 배경만 톤다운, 라벨 텍스트 교체 |
| 텍스트 인풋 | `<TextField label required error>` | error 시 테두리만 `--color-error` |
| 텍스트에어리어 | `<TextArea label hint />` | 자소서 초안 화면은 `--color-bg-textarea` 사용 |
| 공고 리스트 아이템 | `<JobCard job={} onClick={} />` | 보더만 사용, 그림자 없음 |
