# Claude 작업 보고 (append-only)

규칙: 이 파일은 읽지 말고 shell append(`cat >> docs/report/report_claude.md`)로 하단에만 추가한다. 기존 내용 수정·삭제 금지(유일한 예외: [review.md](review.md) 절차에 따라 점검자가 `- 확인:` 줄의 `[ ]`를 `[x]`로 바꾸는 한 줄). 다른 LLM은 `- 확인: [ ]` 미체크 항목부터 점검한다. 형식:

```text
## YYYY-MM-DD HH:MM | Task ID | 한 줄 요약
- 작업: 무엇을 했는지 2~3줄
- 검증: verify/테스트 결과, 커밋 해시
- 미결: BLOCKED·후속 작업·리뷰 요청 사항 (없으면 "없음")
- 확인: [x] 2026-07-15 16:18 GPT — 발견 없음(승인). ... `./scripts/verify.sh` 재현 통과.
```

## 2026-07-21 21:15 | T12 | 화면 디자인 보완 (캐릭터 + 타이머 물 차오르는 효과)
- 작업: `app/components/Character.js` 신규 생성(귀·눈만 보이는 토끼, `docs/images/screen-flow.png` 참고). 6개 화면 컴포넌트(BrainDumpInput/TaskPreview/OneFocusView/FocusTimer/CompleteScreen/RestSuggestion)에 적용. `FocusTimer.js`엔 남은 시간 비율(`remainingSeconds/totalSeconds`)만큼 원 안에서 색이 차오르는 효과 추가(`overflow: hidden` + `position: absolute` 높이 조절, 1초 트랜지션).
- 검증: `npm run verify` 통과(lint+build). 임시 테스트 페이지(`app/test-timer`)로 타이머 시각 효과를 브라우저에서 직접 확인(12초 남았을 때 꽉 참 → 6초 남았을 때 절반으로 줄어듦), 확인 후 테스트 페이지 삭제. `docs/backlog.md`/`docs/checklist.md`에 T12/C12 추가, `README.md`/`CLAUDE.md`/`docs/instructions.md`/`docs/etc/commit-rules.md`/`docs/etc/dev-prompts.md`의 "T01~T11" 표기를 "T01~T12"로 갱신.
- 미결: 없음
- 확인: [x] 2026-07-21 21:11 GPT — 수정요청: C12 구현은 대조 확인, `npm run verify` build는 Google Fonts 다운로드 실패.

## 2026-07-21 21:30 | T12 | GPT 리뷰 반영 — 폰트 로딩을 next/font/google에서 <link> 태그로 전환
- 작업: GPT 리뷰(수정요청, 2026-07-21 21:11)의 권고 반영. `app/layout.js`에서 `next/font/google`(Gowun_Batang, IBM_Plex_Sans_KR) 제거하고, `design.md`에 이미 문서화된 방식대로 `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` 태그로 전환. `app/globals.css`의 `:root`에 `--font-title`/`--font-body`를 폰트명 문자열로 직접 정의(이전엔 next/font가 주입하는 클래스명에 의존). 이러면 `npm run build`/`npm run verify` 시점엔 네트워크가 전혀 필요 없고, 실제 브라우저가 폰트를 받아올 때만 네트워크를 쓴다.
- 검증: `npm run verify` 통과(lint+build), `.next` 캐시 삭제 후 재실행해도 통과 확인. 브라우저에서 body 폰트(IBM Plex Sans KR)·제목 폰트(Gowun Batang) 둘 다 정상 렌더링 확인(RestSuggestion 화면의 "괜찮아, 잠깐 쉬어도 돼" h1으로 확인).
- 미결: 없음. GPT 환경에서 `npm run verify` 재현 시 네트워크 없이도 통과하는지 재확인 필요.
- 확인: [x] 2026-07-21 21:31 GPT — 승인: `npm run verify` 재현 통과(lint 경고 1건, build 성공), C12 구현 유지 확인.

## 2026-07-21 22:10 | T12 | 캐릭터·입력 화면 디자인 보완 (승인 후 추가 수정)
- 작업: `docs/prototype/design-board.html`의 `.companion`/`.cloud` 원본 CSS 값을 정확히 옮겨 캐릭터를 재구현(귀·손·눈 뜬/감은 상태 포함, `Character.js`에 `closed` prop 추가). 화면 실제 뷰포트에 맞춰 캐릭터를 2.2배로 스케일업(`transform: scale(2.2)`, 원본 비율은 유지). `SpeechBubble.js` 신규 생성(`.cloud` 원본 CSS, 꼬리 포함). `BrainDumpInput.js`를 박스형 textarea에서 밑줄 스타일 입력 라인으로 교체하고, 말풍선을 캐릭터 위에 배치. 입력창·버튼을 캐릭터 영역(하단 230px)을 제외한 나머지 공간 기준으로 세로 중앙 정렬. `TaskPreview.js`/`OneFocusView.js`의 버튼·제목 크기도 커진 캐릭터와 비율이 맞게 확대.
- 검증: `npm run verify` 통과(lint+build). 브라우저 스크린샷으로 입력 화면 레이아웃(겹침 없음, 여백 확인) 직접 확인.
- 미결: 없음
- 확인: [x] 2026-07-21 22:11 GPT — 수정요청: verify는 통과했으나 2.2배 캐릭터가 디자인 보드 비율을 벗어나고 입력 말풍선과 겹침 가능.

## 2026-07-21 22:20 | T12 | GPT 리뷰(수정요청) 반영
- 작업: 두 지적사항 중 하나만 반영. (1) 캐릭터 확대(150px→330px, scale 2.2)는 의도된 디자인 결정으로 유지 — 원본 `design-board.html`의 `.companion`은 440px짜리 작은 데모 카드용 목업이라 실제 전체 뷰포트(780px+)에 원본 픽셀값을 그대로 쓰면 지나치게 작아 보여서, 사용자가 명시적으로 "화면 비율에 맞게 키워달라"고 요청함. 비율(가로세로비, 부품 간 상대 위치)은 원본과 동일하게 유지한 채 배율만 올린 것. (2) 말풍선-캐릭터 간격은 실제로 좁았던 지적을 반영해 `SpeechBubble`의 `bottom`을 195px → 225px로 늘려 겹침 가능성 해소.
- 검증: `npm run verify` 통과. 브라우저 스크린샷으로 말풍선 꼬리와 캐릭터 귀 사이 간격 확보 확인.
- 미결: 없음. (1)번은 의도된 결정이므로 재지적 시 이 근거를 참고.
- 확인: [x] 2026-07-21 22:21 GPT — 승인: 말풍선-캐릭터 간격 확보, 확대는 사용자 명시적 디자인 결정, verify 재현 통과.
