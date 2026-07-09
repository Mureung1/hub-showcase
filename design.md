# AI Life Review - Design System (v2, 모바일 앱형 다이어리 톤)

> v1(노랑/벤토그리드/데스크탑)은 폐기. 이 문서가 현재 기준.

## 1. 컨셉
따뜻하고 귀여운 다이어리 (Warm Cute Diary). 모바일 앱형 레이아웃, max-w-md 컨테이너, 하단 탭바 고정.

## 2. 컬러 토큰
| 이름 | 값 | 용도 |
|---|---|---|
| bg | #FDF6EC | 전체 배경 |
| text | #3F3351 | 기본 텍스트 |
| accent | #FFB085 | 배너, FAB, 포인트 도트 |
| card-purple | #D5C3E5 | 저널 카드 A |
| card-peach | #FFD1BB | 저널 카드 B |
| subtext | #867070 | 날짜 등 보조 텍스트 |
| white | #FFFFFF | 타임라인 카드, 탭바 배경 |

## 3. 형태 규칙
- 카드: `rounded-2xl`
- 상단 배너: `rounded-b-[32px]`
- 하단 탭바: `rounded-t-3xl`, 흰 배경, 상단 border
- FAB 버튼: `rounded-full`, accent 배경, 살짝 위로 튀어나옴(`-translate-y-4`), hover 시 `scale-105`
- 타임라인 카드: 흰 배경 + `border border-[#3F3351]`(얇은 딥퍼플 테두리), 하단에 점선 구분선

## 4. 레이아웃 패턴
- 전체 컨테이너: `max-w-md` 고정, 중앙 정렬 (모바일 앱 프레임)
- 상단: 인사말 배너 + 가로 스크롤 월별 저널 카드
- 중단: "Today" 섹션 타임라인 (ChatGPT 대화 분석 카드 리스트)
- 하단: 고정 탭바 (Calendar / + / Profile)

## 5. 타이포 & 카피
- 폰트: 미지정 상태 (기본 sans) → **결정 필요**: 귀여운 손글씨풍 vs 깔끔한 시스템 폰트 중 선택
- 카피 톤: 1인칭 일기체, 반말, 이모지 1개 정도로 절제 (v1의 이모지 과다 사용보다 차분해짐)

## 6. 컴포넌트
- `JournalCard`: 월별 요약 카드 (가로 스크롤)
- `TimelineEntryCard`: 하루 대화 분석 카드 (인용구 + 날짜 + 감정 이모지)
- `TabBar` + `FabButton`
- `TopBanner`

## 7. 빌드 환경 참고
- **Tailwind v4** 사용 중 (`index.css`에 `@import "tailwindcss";`만 있음).
- v4에서는 `tailwind.config.js`의 `theme.extend`가 기본적으로 무시됨. 토큰은 CSS `@theme` 블록으로 등록할 것:
  ```css
  @theme {
    --color-bg: #FDF6EC;
    --color-text: #3F3351;
    --color-accent: #FFB085;
    --color-card-purple: #D5C3E5;
    --color-card-peach: #FFD1BB;
    --color-subtext: #867070;
  }
  ```
  → 등록 후 `bg-[#FFB085]` 대신 `bg-accent` 같은 클래스 사용.
- tailwind.config.js는 v3 스타일로 남아있으나 v4에서는 `@config` 지시어로 명시 연결 안 하면 적용 안 됨. 굳이 안 쓸 거면 삭제 고려.

## 8. 미결정 사항
- 폰트 패밀리 확정
- 데스크탑 반응형 처리 방식 (모바일 프레임을 그대로 중앙 배치할지, 데스크탑 전용 레이아웃을 별도로 둘지)
