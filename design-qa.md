# Design QA — 결정 원장 1안

## 비교 대상

- source visual truth: `C:/Users/thats/.codex/generated_images/019f4cea-51df-7f42-96bd-6587f9f64e67/exec-0fe46d17-f312-4160-ba52-4150cd3a5aed.png`
- browser implementation: `C:/Users/thats/OneDrive/Desktop/codex project/hub-N031/docs/design-qa/decision-ledger-evidence-drawer-1487x1058.png`
- local route: `http://127.0.0.1:4173/demo`
- viewport: `1487 × 1058`, light mode, 공개 데모 샘플 분석, 개요 탭, 근거 패널 열림
- full-view comparison: `C:/Users/thats/OneDrive/Desktop/codex project/hub-N031/docs/design-qa/decision-ledger-comparison-1487x1058.png`
- mobile evidence: `C:/Users/thats/OneDrive/Desktop/codex project/hub-N031/docs/design-qa/decision-ledger-mobile-evidence-375x812.png`

중요한 글자 크기, 버튼, 상태, 원문 인용과 패널 경계가 full-view 비교에서도 읽혀 별도 확대 비교는 필요하지 않았다. 모바일 근거 패널은 별도 캡처로 확인했다.

## Findings

- P0/P1/P2 잔여 이슈 없음.
- 글꼴과 타이포그래피: 기존 KoPub World Dotum 우선 스택을 유지했다. 레퍼런스처럼 핵심 결정은 굵고 큰 두 줄 내외 제목, 이유는 낮은 위계의 본문으로 분리되며 잘림이나 truncation이 없다.
- 간격과 레이아웃: 카드 묶음 대신 hairline과 여백으로 결정, 질문, 관점을 연결했다. 데스크톱 근거 패널이 본문을 덮지 않으며 375, 768, 1024, 1487px에서 가로 넘침이 없다.
- 색상과 토큰: warm paper, white, black, 기존 primary blue만 구조색으로 사용한다. purple/pink AI gradient와 불필요한 glow는 없다.
- 이미지와 자산: 이 화면은 별도 사진·일러스트가 필요 없는 문서형 제품 화면이다. 아이콘은 Phosphor 한 계열을 사용하고 handcrafted SVG, emoji, CSS 장식 그림을 추가하지 않았다.
- 카피와 콘텐츠: 사용자에게 필요한 결정, 이유, 미해결 질문, 참여자 관점, 원문 인용만 전면에 둔다. 내부 프롬프트나 사고 과정은 노출하지 않는다.
- 제품 제약에 따른 의도적 차이: 공개 데모에는 존재하지 않는 과거 실행을 꾸며 넣지 않는다. 로그인 프로젝트의 `AnalysisHistory`에서만 실제 저장 실행을 좌측 원장으로 표시한다. 기존 검정 Modu Brain 워드마크도 유지한다.

## Comparison history

1. 첫 비교
   - evidence: `C:/Users/thats/OneDrive/Desktop/codex project/hub-N031/docs/design-qa/decision-ledger-comparison-pre-fix-1440x1024.png`
   - [P2] 데스크톱 근거 패널이 긴 핵심 결정의 우측 일부를 덮었다.
2. 수정
   - 1200px 이상에서 근거 패널이 열리면 `.landing-shell`과 `.app-page`가 패널 왼쪽의 사용 가능한 폭으로 재배치되도록 조정했다.
   - 1200px 미만에서는 근거 패널을 전체 너비 modal sheet로 전환했다.
3. 재비교
   - evidence: `C:/Users/thats/OneDrive/Desktop/codex project/hub-N031/docs/design-qa/decision-ledger-comparison-1487x1058.png`
   - 본문 우측 `949px`, 패널 좌측 `1049px`로 100px 간격이 확보됐고, 가로 넘침과 제목 잘림이 사라졌다.

## Primary interactions tested

- 개요 → 지식맵 → 온보딩 요약 → 개요 탭 전환
- 확장 분석 열기
- 원문 근거 열기와 닫기
- 근거 패널을 닫은 뒤 호출 버튼으로 포커스 복귀
- 모바일 48px 근거 CTA와 375px 전체 너비 근거 패널
- 375 / 768 / 1024 / 1487px 가로 넘침 검사
- 프로덕션 미리보기 재로딩 이후 새 console error 0건 확인

## Implementation checklist

- [x] 선택한 1안의 결정 중심 읽기 순서 구현
- [x] 실제 실행만 표시하는 분석 이력 원장 구현
- [x] 근거 패널과 검증 상태 구현
- [x] 반응형·키보드 포커스·reduced motion 처리
- [x] lint, unit/integration tests, production build, diff check 통과

## Follow-up polish

- [P3] Supabase 데모 데이터가 준비되면 인증 프로젝트 화면의 실제 실행 3건으로 동일한 1487px 비교 캡처를 추가할 수 있다. 공개 데모에는 가짜 이력을 추가하지 않는다.

final result: passed
