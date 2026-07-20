# Run Report: WEB-006 접근성 회귀

## 1. Keyboard와 focus

- Evidence·compare dialog: 닫기 button initial focus, Escape close, trigger focus return.
- Scene dialog: lazy load 뒤 닫기 button focus, Escape close, 3D entry trigger focus return.
- LNB·RNB: 독립 close/open과 trigger focus return은 WEB-017 browser smoke로 확인했다.
- 검색은 native form/input/button, 선택은 native select와 button을 유지한다.

## 2. Responsive와 zoom

- 390x844: map-first, 분석 조건·결과 열기와 Docs가 지도 위에서 접근 가능.
- 768x1024: 두 panel close controls와 분석 workspace 확인.
- Desktop: evidence dialog keyboard flow 확인.
- Browser 200% zoom: 홈, 검색, 분석 controls가 남고 각 panel이 자체 scroll로 접근 가능.
- `prefers-reduced-motion: reduce`에서 animation과 transition을 사실상 제거한다.

## 3. Contrast 표본

- primary text `#17211a` / white: 16.55:1
- secondary text `#56625a` / white: 6.38:1
- selected green `#1e803f` / white: 4.98:1
- metric help `#647168` / `#f7fbf8`: 4.90:1

## 4. 남은 한계

- MapLibre canvas의 모든 지도 feature는 별도 screen-reader 목록으로 복제하지 않았다. 핵심 점포는 LNB 목록과 검색 결과에서 접근한다.
- 외부 OpenFreeMap style의 전체 색 조합은 LocalTwin이 통제하지 않으며 제품 overlay와 control을 기준으로 검증했다.

## 5. 자동 검증

- FE tests: 21 files, 66 tests 통과
- TypeScript typecheck, lint, production build: 통과
- Task Packet 검사: 59개 통과
