> 📄 **기획서:** [셰르파(Sherpa) — 소규모 마트의 POS 소프트웨어(오프라인 웹앱)](https://github.com/chainru1e/hub/wiki/%EC%85%B0%EB%A5%B4%ED%8C%8C%28Sherpa%29-%EA%B8%B0%ED%9A%8D%EC%84%9C-_-%EC%86%8C%EA%B7%9C%EB%AA%A8-%EB%A7%88%ED%8A%B8%EC%9D%98-POS-%EC%86%8C%ED%94%84%ED%8A%B8%EC%9B%A8%EC%96%B4%28%EC%98%A4%ED%94%84%EB%9D%BC%EC%9D%B8-%EC%9B%B9%EC%95%B1%29)

# 셰르파 · Sherpa — 소개 랜딩 페이지

"바코드 스캔만으로 소규모 마트의 재고와 유통기한을 관리한다"는 아이디어를 소개하는
한 페이지짜리 정적 랜딩 사이트입니다. (실제 기능이 동작하는 앱이 아니라 아이디어 소개용)

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 정적 빌드
npm run preview
```

## 기술 스택

- React 18 + Vite (JavaScript / JSX)
- 순수 CSS (`src/styles.css`, 디자인 토큰은 `:root` CSS 변수)
- 외부 UI 라이브러리 없음. 폰트만 Google Fonts에서 로드
  (IBM Plex Sans KR / IBM Plex Mono / Black Han Sans)

## 구성

위→아래로 스크롤하는 한 페이지, 상단 고정 내비게이션 + 6개 영역:

1. **히어로** — 헤드라인 + 애니메이션 데모 카드("스캔 재고", D-day가 줄며 배지 색 변화)
2. **왜 필요한가** — 문제 제기 카드 3개
3. **핵심 기능** — 기능 그리드 6개
4. **작동 방식** — 3단계
5. **이런 곳에 맞습니다** — 어두운 강조 블록 + 매장 칩 + 강조 지표
6. **푸터** — 프로젝트명 + 팀/발표 정보 자리

## 커스터마이즈

- 프로젝트명·팀·발표 정보: `src/config.js` (`BRAND`)
- 섹션 콘텐츠(문제·기능·단계 등): `src/data.js`
- 색·폰트 등 디자인 토큰: `src/styles.css` 상단 `:root`

## 시그니처 요소 — 유통기한 상태 배지

남은 일수로 상태를 파생해 신호등 색으로 표시합니다(`src/status.js`).
색만이 아니라 "정상/주의/임박/만료" 텍스트를 함께 표기해 접근성을 확보했습니다.

- 남은 일수 ≥ 8 → **정상**
- 남은 일수 4 ~ 7 → **주의**(yellow)
- 남은 일수 0 ~ 3 → **임박**(amber)
- 남은 일수 < 0 (기한 지남) → **만료**(red)

## 접근성 / 모션

- 키보드 포커스 표시, 앵커 내비게이션, 아이콘·데모에 의미 전달 텍스트
- 스크롤 등장 애니메이션은 IntersectionObserver로 처리하며,
  `prefers-reduced-motion`이면 애니메이션·데모 카운트다운을 끄고 정적으로 표시합니다.
