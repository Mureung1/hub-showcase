# 코드 워크스루

이 문서는 이 프로젝트에서 Claude Code가 작업한 내용을 스텝별로 기록한 것입니다.
전문 용어는 처음 나올 때 풀어서 설명하고, 하단 용어집에도 정리합니다.

---

## 스텝 기록

### Step 1 (2026-07-09) — 개인 계정으로 자동화 가능한 세금 업무 지도 그리기

**무엇을 했는지**
- `hometax-fincert-spike/personal-tax-explore.mjs`라는 새 스크립트를 만들었습니다. 이 스크립트는 (1) 예전에 저장해둔 "로그인된 상태"를 재사용해서 홈택스에 다시 들어간 뒤, (2) "전체메뉴"를 열어서 그 안에 있는 모든 메뉴 이름을 통째로 기록하고, (3) 미리 골라둔 후보 3개("국세증명 발급", "환급금 조회", "현금영수증 조회")를 하나씩 클릭해보면서 실제로 화면이 어떻게 생겼는지 관찰했습니다. 제출/발급 버튼은 누르지 않았습니다.
- 실제로 두 번 실행해봤는데, 1차 실행에서 클릭이 엉뚱한 곳에서 막히는 문제를 발견해서 스크립트를 고치고 2차로 다시 실행했습니다.
- 실행 중 로그인 세션이 갑자기 끊기는 문제를 발견해서, 그 원인 추정과 함께 `tax-agent-research.md`에 실측 결과를 기록했습니다.
- `.gitignore`에 `reports/personal/`을 추가해서, 개인 계정 화면을 찍은 스크린샷/텍스트가 실수로 깃허브에 올라가지 않게 막았습니다.

**왜 이렇게 했는지**
- 원래 계획이던 "세금계산서 발행"은 사업자용 인증서가 있어야만 되는데, 사용자가 아직 그 인증서를 구할 수 없는 상황이라 방향을 못 잡고 있었습니다. 그래서 "지금 가진 개인 인증서만으로 뭘 할 수 있는지"부터 눈으로 직접 확인하는 게 먼저라고 판단했습니다.
- 메뉴 이름을 추측만 하고 코드를 짜면 실제 화면과 달라서 계속 실패합니다(이 프로젝트에서 반복적으로 겪은 문제). 그래서 항상 "먼저 화면을 그대로 관찰 → 관찰한 진짜 글자 그대로 다음 스크립트에 반영"하는 순서를 지켰습니다.

**새 용어**
- **storageState (스토리지 스테이트)**: 로그인하면 브라우저에 남는 "로그인 흔적"(쿠키 등)을 파일 하나로 저장해둔 것. 이 파일만 있으면 아이디/비밀번호를 다시 안 치고도 "이미 로그인된 상태"를 재현할 수 있습니다.
- **Playwright (플레이라이트)**: 사람이 마우스로 클릭/입력하는 걸 코드로 대신 시켜주는 자동화 도구.
- **WebSquare (웹스퀘어)**: 정부 사이트(홈택스 포함)에서 자주 쓰는 화면 제작 틀. 화면 요소마다 이름(id)이 페이지를 새로 열 때마다 바뀌어서, 코드가 "이 이름표를 가진 버튼"보다는 "이 글자가 쓰인 버튼"을 찾도록 짜야 안정적입니다.
- **elementFromPoint (엘리먼트 프롬 포인트)**: 브라우저에게 "이 좌표에 실제로 맨 위에 보이는 게 뭐야?"라고 물어보는 기능. 이번에 "글자는 찾았는데 클릭이 안 먹는" 문제(화면 뒤에 같은 글자가 숨어 있었던 경우)를 고치는 데 썼습니다.
- **세션 충돌**: 로그인 흔적이 담긴 파일을 두 개의 브라우저 창이 동시에 쓰면, 서버 쪽에서 "어? 같은 사람이 두 군데서 접속했네" 하고 한쪽을 강제로 로그아웃시킬 수 있는 현상. 이번에 실제로 겪었을 가능성이 있다고 기록해뒀습니다.

**확인 질문**
- `personal-tax-explore.mjs`가 "발급"이나 "제출" 버튼은 절대 안 누르게 만들어둔 이유가 뭐라고 이해하셨나요? (제가 기록한 이유와 맞는지 한번 말씀해주시면 좋을 것 같습니다.)

---

### Step 2 (2026-07-09) — 재로그인 후 후보 3개 검증 마무리

**무엇을 했는지**
- 사용자가 다른 브라우저 창을 다 닫고 `npm run login-test`로 다시 로그인해줬습니다. 그 상태에서 `personal-tax-explore.mjs`를 다시 돌렸습니다.
- 클릭 후 대기 시간을 늘리고(모달이 완전히 그려지길 좀 더 기다림), 후보를 못 찾았을 때 자동으로 진단용 스크린샷을 남기도록 스크립트를 보강했습니다.
- 결과: "환급금 조회"는 실제 조회 화면(날짜 범위, 조회 버튼, 결과표, 엑셀 다운로드)까지 완전히 확인됐고, "현금영수증 조회"는 한 단계 더 들어간 하위 메뉴까지, "국세증명 발급"은 정확히 어느 그룹 안에 있는지까지 확인했습니다. `tax-agent-research.md`에 §1-7로 정리했습니다.

**왜 이렇게 했는지**
- Step 1에서 "환급금 클릭 직후 로그인이 끊겼다"는 문제가 있었는데, 그 원인이 "예전에 열어둔 브라우저 창이 같은 로그인 흔적을 동시에 쓰고 있었기 때문"일 거라고 추정했었습니다. 이번엔 그 창을 다 닫고 재로그인한 뒤 단일 창으로만 실행해서, 그 추정이 맞는지 실제로 검증했습니다. (결과: 맞았습니다 — 이번엔 안 끊겼습니다.)

**새 용어**
- 이번 스텝에서 새로 나온 용어는 없습니다(Step 1의 용어를 그대로 씀).

**확인 질문**
- "환급금 조회"는 이제 진짜 화면(날짜 선택 + 조회 버튼)까지 확인됐는데, "현금영수증 조회"와 "국세증명 발급"은 아직 그 전 단계(메뉴 경로)까지만 확인됐습니다. 이 차이가 이해되셨나요? 다음에 뭘 먼저 마저 확인하면 좋을지도 같이 생각해봐 주세요.

---

### Step 3 (2026-07-09) — 환급금 조회 전 과정 자동화 (첫 실전 자동화 스크립트)

**무엇을 했는지**
- `hometax-fincert-spike/refund-check.mjs`라는 새 스크립트를 만들었습니다. 이건 지금까지처럼 "화면을 관찰만" 하는 게 아니라, 실제로 (1) 로그인 확인 → (2) 메뉴 타고 들어가기 → (3) "조회" 버튼 누르기 → (4) 결과표를 읽어서 파일로 저장하기까지, 사람이 중간에 아무것도 안 눌러도 되는 완전한 자동화입니다.
- 딱 하나 실행했는데 처음부터 끝까지 한 번에 성공했습니다 — "조회된 결과가 없습니다"(현재 환급금이 없으니 정상)까지 정확히 읽어서 파일로 저장했습니다.
- 결과표에는 계좌번호 같은 민감한 정보가 들어갈 수도 있어서, 터미널(콘솔)에는 "몇 건 나왔다"는 숫자만 보여주고, 실제 내용은 깃허브에 안 올라가는 폴더(`reports/personal/`)에만 저장하게 만들었습니다.
- `tax-agent-research.md`에 §1-8로 기록했습니다.

**왜 이렇게 했는지**
- 지금까지(Step 1~2)는 "이 메뉴가 어디 있는지" 지도만 그렸지, 실제로 뭔가를 자동으로 실행해본 적은 없었습니다. 사용자가 "자동화할 수 있는 대상을 찾았으면 실제로 자동화 테스트를 해보자"고 해서, 셋 중 가장 확실하게 확인된 "환급금 조회"부터 진짜로 끝까지 자동 실행되는지 시험해봤습니다.
- "조회" 버튼은 화면 안에 "조회구분"이라는 비슷한 글자도 있어서, 글자만 보고 찾으면 잘못 누를 수 있습니다. 그래서 "버튼 역할(role)을 가진 요소 중에서 글자가 정확히 '조회'인 것"으로 더 정확하게 찾도록 했습니다.

**새 용어**
- **role (역할)**: 화면 요소가 "이건 버튼이다", "이건 링크다" 하고 스스로 밝히는 정보. 글자만 보고 찾으면 라벨(설명 글자)과 진짜 버튼을 헷갈릴 수 있는데, role로 좁히면 "진짜 버튼"만 정확히 찾을 수 있습니다.

**확인 질문**
- 이 스크립트가 "조회" 버튼은 자동으로 누르면서, 왜 (만약 있다면) "발급"이나 "신청" 버튼은 자동으로 안 누르게 만들었을까요? 두 버튼의 차이가 뭔지 한번 설명해주실 수 있나요?

---

### Step 4 (2026-07-09) — refund-check.mjs의 "조회" 버튼 가시성 체크를 다른 헬퍼와 일관되게 고침

**무엇을 했는지 (한 줄)**
`hometax-fincert-spike/refund-check.mjs`에서 "조회" 버튼이 진짜로 눌러도 되는 상태인지 확인하는 방식을, 파일 안 다른 함수(`findVisibleByText`)와 똑같이 "화면 뒤에 다른 게 가리고 있진 않은지"까지 확인하도록 바꿨습니다.

**핵심 코드**

```javascript
const queryButton = page.getByRole('button', { name: '조회', exact: true }).first();
const queryButtonVisible = await queryButton
  .evaluate((el) => {
    const rect = el.getBoundingClientRect();
    // ↑ 이 버튼이 화면 어디에 있는지 좌표를 잽니다
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // ↑ 버튼 한가운데 좌표를 계산해요
    const topEl = document.elementFromPoint(cx, cy);
    // ↑ 핵심! "이 좌표에서 실제로 맨 위에 보이는 게 뭐야?"라고 브라우저에 물어봐요
    return !!topEl && (el.contains(topEl) || topEl.contains(el));
    // ↑ 물어본 답이 우리가 찾던 그 버튼이 맞는지 확인합니다
  })
  .catch(() => false);
```

원래는 `queryButton.isVisible()`만 썼는데, 이건 "CSS상 화면에 보이긴 하는지"만 확인하고 "다른 팝업/레이어에 가려서 실제로는 못 누르는 상태인지"는 확인하지 못합니다. `personal-tax-explore.mjs`(Step 1)에서 이미 이 문제(화면 뒤에 숨은 같은 글자에 클릭이 가로막히는 문제)를 실제로 겪었던 적이 있어서, 같은 안전장치를 이 파일에도 넣었습니다.

**새로 나온 용어**
- 이번 스텝에서 새로 나온 용어는 없습니다 (elementFromPoint는 Step 1 용어집에 이미 있음).

**확인 질문**
- 원래 코드(`isVisible()`만 씀)와 지금 코드의 차이가 뭔지, 왜 하필 홈택스 같은 화면에서 이 차이가 실제 문제로 이어질 수 있는지 한 문장으로 설명해주실 수 있나요?

---

### Step 5 (2026-07-09) — 환급금 조회 결과를 실제 이메일로 발송하는 스크립트 추가

**무엇을 했는지 (한 줄)**
`hometax-fincert-spike/refund-email-send.mjs`를 새로 만들어, `refund-check.mjs`가 저장해둔 조회 결과를 실제 Gmail로 발송할 수 있게 했습니다. 처음엔 Claude에 연결된 Gmail 도구로 "초안"까지만 만들려 했는데, 그건 진짜 "발송"이 안 되길래(도구 자체 제약), 사용자 요청으로 조사해서 Nodemailer(순수 Node.js 메일 라이브러리)로 바꿨습니다.

**핵심 코드**

```javascript
const confirmation = await pause('실제로 발송하려면 정확히 "발송확인" 을 입력하세요 (다른 입력 시 중단): ');
if (confirmation.trim() !== '발송확인') {
  console.log('확인 문자열이 일치하지 않아 중단합니다. 이메일은 발송되지 않았습니다.');
  return;
  // ↑ 정확히 이 4글자를 안 치면 여기서 그냥 끝나버립니다. 오타 방지 + "진짜 보낼 거 맞아?" 확인용
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: sender, pass: appPassword },
  // ↑ 일반 로그인 비밀번호가 아니라 Google이 자동화 도구 전용으로 따로 발급해주는 "앱 비밀번호"를 씀
});

const info = await transporter.sendMail({ from: sender, to: recipient, subject, text: body });
// ↑ 여기서 실제로 이메일 서버(Gmail)에 접속해서 메일을 내보냅니다 — 이 줄이 실행되면 취소 불가능
```

이 저장소가 `invoice-issue.mjs`에서부터 지켜온 규칙("되돌릴 수 없는 액션은 사람이 마지막에 정확한 문자열을 직접 입력해야만 실행")을 이메일 발송에도 똑같이 적용했습니다. 또한 `npm install` 직후 `npm audit`에서 nodemailer의 알려진 보안 취약점이 발견돼(SMTP 명령 삽입 등), 패치된 `^9.0.3` 버전으로 올렸습니다.

**새로 나온 용어**
- **앱 비밀번호(App Password)**: 원래 로그인 비밀번호 대신, "이 프로그램만 내 계정에 접근하게 허용"하는 용도로 Google이 따로 발급해주는 16자리 비밀번호. 2단계 인증을 켜야 발급받을 수 있고, 유출돼도 실제 로그인 비밀번호와는 분리돼 있어 상대적으로 안전함.
- **SMTP**: 이메일을 실제로 "보내는" 데 쓰이는 오래된 표준 통신 방식. Nodemailer는 이 SMTP로 Gmail 서버에 직접 접속해서 메일을 발송함.
- **npm audit**: 지금 설치된 패키지들 중에 알려진 보안 취약점이 있는지 검사해주는 npm 내장 명령어.

**확인 질문**
- Gmail MCP(초안만 생성)와 이번에 만든 Nodemailer 방식(실제 발송)의 근본적인 차이가 뭔지, 그리고 "발송확인" 문자열 게이트가 왜 두 방식 중 실제 발송이 되는 쪽에 훨씬 더 중요한지 설명해주실 수 있나요?

---

### Step 6 (2026-07-09) — 조회기간 확장 + "엑셀 내려받기" 실제 파일 다운로드 추가

**무엇을 했는지 (한 줄)**
`refund-check.mjs`가 화면 기본 조회기간(최근 1개월)만 보고 "환급금 없음"이라고 결론 내리는 게 정확한지 의심이 들어서, (1) 실행 시 조회기간 시작일을 몇 년 전까지 넓힐지 사람에게 직접 물어보게 하고, (2) 테이블 스크래핑 대신 홈택스가 직접 만들어주는 "엑셀 내려받기" 파일을 실제로 저장하는 기능을 추가했습니다.

**핵심 코드**

```javascript
const yearsInput = await pause(
  '조회기간 시작일을 몇 년 전으로 넓힐까요? (화면 기본값은 최근 1개월 — 엔터=기본값 유지, 숫자 입력 시 최대 5년까지 적용): '
);
const years = Math.min(Math.max(parseInt(yearsInput.trim(), 10) || 0, 0), 5);
// ↑ 화면 안내문에 "조회일로부터 5년 이내만 조회 가능"이라고 적혀 있어서 그 이상은 의미가 없어 5로 clamp

if (years > 0) {
  const startDateInput = page.locator('#mf_txppWframe_calStrtDt_input');
  await startDateInput.click({ timeout: 5000 });
  await startDateInput.fill(startDateStr);
  // ↑ 달력 위젯처럼 보이지만 실측해보니 readOnly가 아니라서 직접 타이핑으로 값이 그대로 반영됨
}
```

```javascript
if (meaningfulRows.length === 0) {
  console.log('조회 결과가 0건이라 엑셀 다운로드는 생략합니다.');
  // ↑ 처음엔 무조건 다운로드 버튼을 눌렀는데, 0건일 때 누르면 홈택스가
  //   "조회된 데이터가 없습니다" 알림창을 띄우며 거부한다는 걸 실측으로 확인하고 이 분기를 추가함
} else {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    excelButton.click({ timeout: 8000 }),
  ]);
  await download.saveAs(downloadedPath);
}
```

**왜 이렇게 했는지**
사용자가 "환급금이 없다고 나오는데 PDF/한글 문서 같은 게 빠진 거 아니냐"고 물어봤습니다. 확인해보니 PDF는 관련 없었지만(이 화면은 테이블 하나로 다 보여줌), 더 중요한 진짜 문제를 하나 찾았습니다 — 조회기간이 기본으로 최근 1개월만 잡혀 있어서, "0건"이 "5년간 없다"가 아니라 "최근 1개월간 없다"만 증명한 상태였습니다. 사용자는 스크립트가 날짜를 임의로 5년으로 넓히는 것도 원하지 않아서, 대신 사람에게 직접 몇 년을 볼지 물어보고, 테이블 스크래핑 결과를 신뢰하는 대신 홈택스가 공식적으로 만들어주는 파일 자체를 받아서 이중 확인이 가능하게 만들었습니다.

**새로 나온 용어**
- **dialog(대화상자) 이벤트**: 브라우저가 `alert`/`confirm`/`prompt` 같은 팝업을 띄울 때 Playwright가 감지할 수 있는 신호. 이번에 "엑셀 내려받기"를 0건 상태에서 눌렀을 때 뜨는 "조회된 데이터가 없습니다" 알림창을 이걸로 잡아서 원인을 확인했습니다.
- **page.waitForEvent('download')**: 클릭 후 브라우저가 실제로 파일 다운로드를 시작하길 기다리는 Playwright 기능. 다운로드가 시작되면 그 파일을 원하는 경로에 저장(`saveAs`)할 수 있음.

**확인 질문**
스크립트가 "엑셀 내려받기" 버튼을 0건일 때는 아예 안 누르도록 바꾼 이유가 뭔지, 그리고 이게 단순히 "에러 방지"를 넘어서 왜 우리가 "0건" 결과를 더 신뢰할 수 있게 만들어주는지 설명해주실 수 있나요?

---

### Step 7 (2026-07-10) — 완전자동화 폐기, "화면 위 강조 가이드" 크롬 확장 프로그램으로 전환

**무엇을 했는지 (한 줄)**
멘토 피드백 이후 방향을 완전히 바꿔서, `hometax-guide-extension/`이라는 새 폴더에 크롬 확장 프로그램(`manifest.json`, `content-script.js`, `background.js`, `popup/`)과 LLM 설명용 프록시 서버(`server/`)를 새로 만들었습니다. 이전까지의 Playwright 스크립트들은 "대신 클릭"했지만, 이번 확장 프로그램은 **사용자가 눌러야 할 버튼을 화면 위에 색깔로 강조만 하고, 실제 클릭은 항상 사용자 본인이** 합니다.

**핵심 코드**

`content-script.js`의 요소 탐색 함수 — Step 1/4에서 Playwright(`page.evaluate`) 안에서 쓰던 `elementFromPoint` 트릭을, 이번엔 Playwright 없이 브라우저 자체 자바스크립트(콘텐츠 스크립트)로 그대로 옮겼습니다:

```javascript
function findVisibleTarget(textOrTexts, { exact = false } = {}) {
  const texts = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
  const candidates = document.querySelectorAll(CLICKABLE_SELECTOR);

  for (const el of candidates) {
    const content = (el.textContent || '').trim();
    const matches = texts.some((t) => (exact ? content === t : content.includes(t)));
    if (!matches) continue;
    // ↑ 지금까지처럼 "글자로" 후보를 찾습니다 (id 대신 — WebSquare 원칙 그대로 유지)

    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const visible = rect.width > 0 && rect.height > 0
      && style.visibility !== 'hidden' && style.display !== 'none';
    if (!visible) continue;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    // ↑ Step 1/4와 똑같은 질문: "이 좌표에서 실제로 맨 위에 보이는 게 뭐야?"
    if (topEl && (el.contains(topEl) || topEl.contains(el))) {
      return el;
      // ↑ 찾았다! 이 요소를 강조 박스로 하이라이트할 대상으로 돌려줍니다
    }
  }
  return null;
}
```

같은 파일의 스텝 진행 부분 — "찾기"와 "누르기"를 완전히 분리해서, 확장 프로그램은 절대 클릭을 실행하지 않고 **사람의 클릭을 기다리기만** 합니다:

```javascript
highlightElement(el, step.label);
// ↑ 여기까지는 확장 프로그램이 함: 찾아서 강조 박스만 그림 (el.click() 같은 코드는 어디에도 없음)

el.addEventListener('click', function onClick() {
  el.removeEventListener('click', onClick, true);
  clearHighlight();
  runStep(index + 1);
  // ↑ 사람이 "진짜로" 클릭한 순간에만 이 콜백이 실행되고, 다음 스텝으로 넘어감
}, { capture: true, once: true });
```

이 두 조각이 이번 피벗의 핵심입니다: 탐색/판단 로직(Step 1~6에서 갈고닦은 것)은 그대로 재사용하되, "누가 클릭하느냐"만 프로그램에서 사람으로 완전히 넘겼습니다. LLM 설명 부분(`server/server.mjs`의 `POST /api/explain`)은 비교적 단순한 Express 라우트라 생략했습니다 — 궁금하시면 말씀해주세요.

**새로 나온 용어**
- **크롬 확장 프로그램 / Manifest V3**: 브라우저에 설치해서 특정 사이트 화면에 개입할 수 있게 해주는 작은 프로그램. `manifest.json`이 "어느 사이트에, 어떤 코드를 넣을지"를 정의하는 설정 파일이고, Manifest V3는 그 설정 파일의 최신 규격입니다.
- **콘텐츠 스크립트(content script)**: 확장 프로그램이 실제 웹페이지(여기선 홈택스 화면) 안에 주입해서 그 페이지의 DOM(화면 요소들)을 직접 읽고 조작할 수 있게 해주는 자바스크립트 파일.
- **Shadow DOM(섀도우 돔)**: 확장 프로그램이 그리는 강조 박스 CSS가 홈택스 자체 스타일과 충돌하지 않도록, 페이지 안에 "격리된 미니 페이지"를 하나 더 만들어 그 안에서만 스타일이 적용되게 하는 브라우저 기능.
- **백그라운드 서비스 워커**: 콘텐츠 스크립트와 외부 서버(프록시 서버) 사이를 중계하는, 확장 프로그램 뒤편에서 계속 대기하는 스크립트. `background.js`가 이 역할입니다.
- **프록시 서버**: 확장 프로그램이 Claude API 키를 직접 들고 있으면 브라우저에서 키가 노출될 위험이 있어서, 키를 대신 보관하고 요청만 중계해주는 아주 작은 서버 (`server/server.mjs`).
- **MutationObserver(뮤테이션 옵저버)**: "이 화면 안에서 뭔가 바뀌면 알려줘"라고 브라우저에 등록해두는 기능. 홈택스가 클릭 후에도 한참 더 로딩되기 때문에, 다음 버튼이 나타날 때까지 이걸로 계속 지켜봅니다.

**확인 질문**
이전 Playwright 스크립트(`refund-check.mjs`)와 이번 콘텐츠 스크립트(`content-script.js`)는 둘 다 "조회" 버튼을 `elementFromPoint`로 확인하는 로직을 쓰는데, 결정적으로 하나는 그 버튼을 **찾은 뒤 코드가 직접 누르고**, 하나는 **찾은 뒤 사람이 누르길 기다립니다**. 이 차이가 왜 이번 방향 전환(멘토 피드백)의 핵심인지 한 문장으로 설명해주실 수 있나요?

#### 답변 : 비결정론적문제 playwrite의 한계 
---

### Step 8 (2026-07-10) — design.md 톤으로 "환급금 조회" 목업 UI 신규 제작

**무엇을 했는지 (한 줄)**
레퍼런스 목업 이미지 1장에서 색상/타이포그래피/레이아웃 규칙을 뽑아 `docs/design.md`로 일반화한 뒤, 그 디자인 시스템을 실제로 적용한 `refund-agent-prototype/index.html`을 새로 만들었습니다. 내용은 `tax-invoice-agent-prototype`(사업자 세금계산서 발행, 지금은 막힌 방향)이 아니라, `refund-check.mjs` / `refund-email-send.mjs`(개인 환급금 조회 자동화, Playwright가 직접 클릭·발송하는 기존 버전)의 흐름을 반영했습니다.

**핵심 코드**

```javascript
function computeResultRows(){
  // 실제로 겪은 패턴을 그대로 반영: 기본값(최근 1개월)은 0건, 기간을 넓히면 과거 환급 내역이 나옴
  return state.years === 0 ? [] : MOCK_ROWS;
  // ↑ Step 6에서 실제로 확인했던 문제(기본 조회기간이 좁아서 "0건"이 "5년간 없음"을 증명하지 못함)를
  //   목업 안에서도 그대로 체험할 수 있게, "기본값 선택 시에만 0건"으로 하드코딩했습니다.
}
```

```javascript
function goScreen(n){
  state.current = n;
  document.querySelectorAll('.screen').forEach(function(s){
    s.classList.toggle('is-active', Number(s.dataset.screen) === n);
  });
  // ...
  if (n === 6){
    goScreen(5);
    // ↑ 화면 ⑥(발송 확인)은 독립된 화면이 아니라 화면 ⑤ 위에 뜨는 모달이라서,
    //   먼저 ⑤를 그대로 그린 다음
    state.current = 6;
    updateTracker();
    openModal();
    // ↑ 그 위에 모달만 덧씌웁니다. tracker에는 "6단계(확인)"로 표시되지만
    //   실제 화면(.screen)은 5번 화면 그대로 켜져 있는 상태입니다.
    return;
  }
}
```

**왜 이렇게 했는지**
CLAUDE.md에는 "사업자 인증서 기반 세금계산서 발행은 막혀 있고, 개인 계정의 환급금 조회가 확정된 방향"이라고만 적혀 있어서, 어느 프로젝트를 반영할지 사용자에게 먼저 물었습니다(환급금 조회 자동화 선택받음). 실제 스크립트(`refund-check.mjs`)의 동작 — storageState 재사용, role=button으로 "조회" 버튼 특정, 0건일 때 엑셀 다운로드 생략, "발송확인" 문자열 게이트 — 을 화면 캡션과 로직에 그대로 옮겨서, 색만 바꾼 껍데기가 아니라 실제 자동화 동작을 재현하는 목업이 되도록 했습니다.
작업 중 이 대화에서는 만들지 않은 `hometax-guide-extension/`(Step 7, 완전자동화 대신 "화면 강조 후 사람이 직접 클릭"하는 크롬 확장 프로그램으로의 방향 전환)이 저장소에 이미 존재하는 걸 뒤늦게 발견했습니다 — 이 목업은 그 최신 피벗이 아니라 그 이전 버전(Playwright가 직접 클릭/발송)을 반영한 것이라는 점을 사용자에게 알렸습니다.

**새로 나온 용어**
- **디자인 토큰 (Design Token)**: 색상·폰트 크기·여백 같은 디자인 값에 `--accent-cyan`처럼 이름을 붙여 CSS 변수(`:root { ... }`)로 모아둔 것. `docs/design.md`에 정리한 팔레트/타이포 값을 그대로 이 파일의 `:root`에 옮겨서, 나중에 값만 바꾸면 전체 화면 톤이 한 번에 바뀌게 만들었습니다.
- **커스텀 모달 vs 네이티브 dialog**: Step 6 용어집의 "dialog 이벤트"는 브라우저가 직접 띄우는 `alert`/`confirm` 팝업이고, 이번 화면 ⑥의 "모달"은 그것과 다르게 그냥 `.modal` CSS 클래스와 `position:absolute`로 화면 위에 그린 "가짜" 팝업입니다. 실제 브라우저 dialog가 아니라서 `page.on('dialog')`로는 감지되지 않는다는 차이가 있습니다.

**확인 질문**
`computeResultRows()`가 "조회기간 기본값(0)을 선택했을 때만 0건"으로 하드코딩된 이유가 뭔지, 그리고 이게 실제 `refund-check.mjs`를 만들면서 겪었던 어떤 문제(Step 6 기록 참고)를 다시 보여주려는 의도인지 설명해주실 수 있나요?

#### 답변 :  
---

### Step 8-2 (2026-07-10) — 실제 홈택스 화면에서 재현 후 매칭 로직 2가지 버그 수정

> 번호 안내: 이 시점에 다른 세션에서 동시에 `refund-agent-prototype/` 목업 UI 작업을 진행하며 같은 "Step 8" 번호를 먼저 썼습니다. 번호 충돌을 피하려고 이 기록(이 대화의 작업)만 "Step 8-2"로 표기합니다 — 실제 작업 순서상으로는 Step 7 바로 다음, Step 9 바로 전입니다.

**무엇을 했는지 (한 줄)**
사용자가 "납부·고지·환급 단계가 엉뚱한 걸 잡는다"고 알려줘서, claude-in-chrome으로 실제 홈택스 화면(사용자가 이미 로그인해둔 세션 공유)에 직접 들어가 원인을 확인하고 `content-script.js`를 두 군데 고쳤습니다.

**핵심 코드**

```javascript
// WebSquare의 "전체메뉴" 팝업은 이 클래스를 가진 컨테이너로 뜬다(실측 확인).
const POPUP_SELECTOR = '.w2popup_window';

function getSearchRoot() {
  const popups = Array.from(document.querySelectorAll(POPUP_SELECTOR)).filter((popup) => {
    const rect = popup.getBoundingClientRect();
    const style = getComputedStyle(popup);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  return popups.length > 0 ? popups[popups.length - 1] : document;
  // ↑ 팝업이 열려 있으면 그 팝업 "안에서만" 찾고, 없으면(팝업이 닫힌 뒤) 페이지 전체에서 찾음
}
```

```javascript
function findVisibleTarget(textOrTexts, { exact = false } = {}) {
  // 후보 문구 여러 개를 하나의 OR 풀로 섞지 않고, 정확한 문구부터 "한 문구씩 통째로" 시도한다.
  const options = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
  for (const text of options) {
    const found = findByExactText(text, exact);
    if (found) return found;
    // ↑ 첫 번째(가장 정확한) 문구로 찾아지면 바로 반환하고, 폴백 문구는 시도조차 안 함
  }
  return null;
}
```

**왜 이렇게 했는지**
실제 화면을 열어서 확인해보니 두 가지가 확인됐습니다:
1. "환급금" 단계 예상 라벨이 "환급금 조회"였는데 실제로는 **"환급금 상세조회"**였고, 같은 화면에 "국세 환급금찾기"라는 완전히 다른 메뉴도 있어서, 느슨한 문구 `'환급금'`이 두 메뉴 모두에 걸리는 걸 실측으로 직접 확인했습니다(이전엔 우연히 DOM 순서상 맞는 걸 집었을 뿐, 언제든 깨질 수 있는 구조였습니다).
2. 지금까지는 페이지 전체(`document`)에서 찾다 보니, 팝업 바깥(헤더 등)의 동일 텍스트에 걸릴 위험이 항상 있었습니다. 실제 "전체메뉴" 팝업 컨테이너가 `.w2popup_window`라는 안정적인 클래스를 쓴다는 걸 확인해서, 팝업이 열려 있을 땐 그 안으로만 탐색 범위를 좁혔습니다.

두 수정 다 실제 화면에서 다시 재현해서 "납부·고지·환급"과 "환급금 상세조회" 둘 다 정확한 요소로 해결되는 걸 확인했습니다.

**새로 나온 용어**
- 이번 스텝에서 새로 나온 용어는 없습니다 (Step 7의 Shadow DOM/콘텐츠 스크립트 개념을 그대로 사용).

**확인 질문**
검증 중에 실제로 "환급금 상세조회"를 눌러 다음 화면까지 넘어갔더니 홈택스가 로그인을 풀어버렸는데, 이게 왜 일어났다고 생각하시나요? (힌트: Step 1 용어집의 "세션 충돌"과 관련 있습니다.)
#### 답변 : 동일 아이디 동시 접속

---

### Step 9 (2026-07-10) — 고정 스텝 순서를 폐기하고 AI가 매번 다음 버튼을 판단하는 방식으로 전환

**무엇을 했는지 (한 줄)**
Step 7~8-2에서 만든 "정해진 4단계(전체메뉴→납부고지환급→환급금상세조회→조회)"를 하드코딩한 방식이 라벨 문구가 조금만 달라져도 깨지는 걸 겪은 뒤, 사용자가 Anthropic API 키를 준비해줘서 완전히 다른 방식으로 바꿨습니다: 이제 콘텐츠 스크립트가 "지금 화면에 보이는 클릭 가능한 요소 전부"를 매번 목록으로 만들어 서버에 보내고, Claude가 그 목록 중 어떤 걸 다음에 눌러야 할지 그때그때 골라줍니다. `content-script.js`, `background.js`, `server/server.mjs`, `popup/*`를 전부 이 방식에 맞게 고쳤습니다.

**핵심 코드**

화면을 통째로 "지금 누를 수 있는 것들의 목록"으로 바꾸는 부분 (기존엔 미리 정해둔 글자 하나만 찾았다면, 이젠 화면에 있는 걸 다 모아서 AI에게 보여줍니다):

```javascript
function serializeInteractiveElements() {
  const root = getSearchRoot();
  const candidates = root.querySelectorAll(CLICKABLE_SELECTOR);
  const seen = new Set();
  const list = [];
  elementRegistry = [];
  // ↑ AI에게는 "글자"만 보내고, 진짜 DOM 요소는 여기(로컬 배열)에만 보관합니다

  for (const el of candidates) {
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (!text || text.length > 60) continue;
    if (!isLeafLike(el)) continue;
    // ↑ Step 1~8에서 쓰던 visible/occlusion 체크는 그대로 재사용 (아래 생략)

    const index = elementRegistry.length;
    elementRegistry.push(el);
    list.push({ index, text, role: el.getAttribute('role') || el.tagName.toLowerCase() });
    // ↑ "0번은 이 버튼, 1번은 저 링크" 식으로 번호를 매겨서 AI에게 넘길 준비를 합니다
  }
  return list;
}
```

AI의 판단을 받아 하이라이트하고, 사람의 진짜 클릭을 기다리는 루프 (이 저장소의 핵심 원칙이 그대로 지켜집니다 — AI는 "고르기"만, 클릭은 "사람"만):

```javascript
const response = await askLlmForNextStep(goal, elements, history);
const { index, label, done, message } = response.data || {};

if (done) {
  showPanelMessage(message || '완료됐습니다.');
  break;
  // ↑ AI가 "이제 목표 달성된 것 같다"고 판단하면 여기서 멈춥니다
}

const target = typeof index === 'number' ? elementRegistry[index] : null;
highlightElement(target, label || '이 버튼을 클릭하세요');
await waitForRealClick(target);
// ↑ 여기가 핵심: AI가 고른 건 "어디를 강조할지"뿐이고, 실제 클릭은 사람이 할 때까지 그냥 기다립니다
```

서버 쪽(`server.mjs`)은 이 목록과 목표를 프롬프트(AI에게 주는 질문 텍스트)로 만들어 Claude에 보내고, "반드시 JSON으로만 답해라"라고 지시한 뒤 그 JSON을 그대로 돌려주는 역할만 합니다 — 비교적 단순해서 생략했습니다.

**새로 나온 용어**
- **프롬프트(prompt)**: AI에게 "이런 상황이고 이렇게 답해줘"라고 보내는 질문/지시 텍스트. 이번엔 "목표 + 지금 클릭 가능한 목록 + 지금까지 클릭한 이력"을 하나의 프롬프트로 묶어서 보냈습니다.
- **JSON 파싱 폴백**: AI가 항상 완벽한 JSON만 준다는 보장이 없어서, `JSON.parse`가 실패하면 정규식으로 `{...}` 부분만 다시 뽑아보고, 그마저 실패하면 "이해 못 한 응답"이라는 안전한 기본값으로 대체하는 3단계 안전장치.

**확인 질문**
Step 7~8-2의 "정해진 4단계" 방식과 이번 "AI가 매번 화면을 보고 고르는" 방식의 가장 큰 차이가 뭐라고 생각하시나요? 그리고 이렇게 바꿔도 "확장 프로그램이 대신 클릭하지 않는다"는 원칙은 왜 여전히 그대로 유지되는지 설명해주실 수 있나요?
#### 답변 :  전자는 하드코딩되어 능동적이지 못하고 후자는 능동적이게 사람의 요청에 따라 대응할 수 있음 / 확장프로그램에서 직접 클릭하는건 불가능하기 때문에 
---

### Step 10 (2026-07-10) — "AI 응답 생성 실패" 원인 진단 후 `temperature: 0` 제거

**무엇을 했는지 (한 줄)**
확장 프로그램이 계속 "AI 응답 생성에 실패했습니다"만 반환해서, 서버 프로세스/API 키 문제부터 하나씩 배제하며 진짜 원인을 좁혀갔습니다. 결국 `server.mjs`에 있던 `temperature: 0`이 Claude Sonnet 5에서 거부되는 값이라는 걸 찾아서 지웠습니다.

**핵심 코드**

```javascript
// 고치기 전
const message = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 400,
  temperature: 0,
  // ↑ "항상 같은 답을 주게" 하려고 넣었던 값인데, Sonnet 5는 기본값이 아닌
  //   temperature/top_p/top_k를 받으면 그냥 거부(400 에러)해버립니다
  messages: [{ role: 'user', content: prompt }],
});

// 고친 후 — 그냥 지움 (Sonnet 5는 온도 조절 없이도 충분히 일관됨)
const message = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 400,
  messages: [{ role: 'user', content: prompt }],
});
```

**왜 이렇게 찾았는지 (진단 과정)**
1. 먼저 "혹시 예전 서버 프로세스가 계속 낡은 키를 물고 있는 거 아닐까?"부터 의심했습니다 — `.env` 파일을 고쳐도 이미 떠 있는 프로세스는 그 값을 다시 안 읽어들이기 때문입니다. 그래서 포트 4000을 쓰고 있던 프로세스를 찾아 완전히 새로 띄워봤습니다.
2. 그래도 똑같이 실패해서, 이번엔 "키 자체가 잘못됐나?"를 의심했습니다. 서버를 거치지 않고 같은 `.env`의 키로 Claude API를 직접 한 번 호출해봤는데 — 이건 성공했습니다. 즉 키는 멀쩡하고, 문제는 서버 코드 안에 있다는 뜻이었습니다.
3. 직접 호출(성공)과 서버 코드(실패)의 차이를 비교해보니, 서버 코드에만 `temperature: 0`이 붙어 있었습니다. 마침 조금 전에 확인한 참고 자료에 "Sonnet 5는 temperature 같은 값을 기본값 아닌 걸로 주면 400 에러를 낸다"는 내용이 있어서, 바로 그게 원인이라는 걸 확정할 수 있었습니다.

**새로 나온 용어**
- **temperature(온도)**: AI 응답의 "무작위성" 정도를 조절하는 옵션. 낮을수록(0에 가까울수록) 매번 비슷한 답을, 높을수록 다양한 답을 내놓게 됩니다. 이번에 쓴 최신 모델(Sonnet 5)은 이 값을 기본값 그대로 두지 않으면 아예 요청을 거부합니다.

**확인 질문**
"서버 프로세스가 낡은 키를 물고 있다"는 가설과 "코드 안의 `temperature: 0`이 문제"라는 진짜 원인, 이 둘을 구분하는 데 결정적이었던 한 번의 테스트가 뭐였는지 기억나시나요? (힌트: 서버를 거치지 않고 API를 직접 호출해본 부분입니다.)
#### 답변 : 업그레이드되서 클로드측에서 tempertature를 삭제했는데 모델이 업데이트가 느려서 확인을 못했음
 
---

### Step 11 (2026-07-10) — 안내가 조용히 끝나버리는 문제 수정 ("완료" 메시지 누락)

**무엇을 했는지 (한 줄)**
사용자가 "더 클릭할 게 없는데 안내가 끝나고 나서 아무 말이 없다"고 알려줘서, `content-script.js`의 루프 구조 허점과 `server.mjs`의 완료 판단 프롬프트를 같이 고쳤습니다.

**핵심 코드**

```javascript
// 고치기 전: for 루프가 break 없이 12턴을 다 채우고 끝나면 아무 메시지도 안 뜨고 그냥 종료됨
for (let turn = 0; turn < MAX_TURNS; turn++) { /* ... */ }
running = false;
```

```javascript
// 고친 후: break로 끝났는지 추적해서, 아니라면(=12턴 다 씀) 반드시 뭔가 보여줌
let finished = false;
for (let turn = 0; turn < MAX_TURNS; turn++) {
  // ... done이나 target-not-found 상황에서 finished = true 로 표시하고 break
}
if (!finished) {
  clearHighlight();
  showPanelMessage('안내 가능한 단계 수(12단계)를 다 사용했어요. ...');
  // ↑ 이게 없으면 루프가 그냥 끝나면서 하이라이트만 사라지고 사용자에겐 침묵만 남았음
}
```

서버 쪽(`server.mjs`)은 AI에게 주는 프롬프트에 "완료 판단을 적극적으로 하라"는 구체적 기준(방금 조회/검색을 눌렀고 결과 화면이 이미 보이면, 또는 남은 게 로그아웃·즐겨찾기처럼 목표와 무관한 것뿐이면 done을 true로)을 추가했습니다 — 비교적 프롬프트 문구 조정이라 코드는 생략했습니다.

**왜 이렇게 했는지**
증상("안내가 끝난 것 같은데 말이 없다")이 나올 수 있는 경로가 코드에 두 군데 있었습니다: (1) AI가 "완료"라고 스스로 판단은 못 하면서 남은 후보 중 아무거나 계속 고르다가 12턴을 다 써버리는 경우, (2) AI가 완료 판단 자체를 애매하게 하는 경우. 실제로 시뮬레이션 테스트("방금 조회 버튼을 누른 직후" 상황을 서버에 직접 보내봄)로 (2)가 실제로 개선됐는지 확인했고, (1)은 구조적으로 아예 침묵하는 경로를 막아뒀습니다.

**새로 나온 용어**
- 이번 스텝에서 새로 나온 용어는 없습니다.

**확인 질문**
"AI가 완료 판단을 못 내리는 문제"와 "완료 판단과 상관없이 루프가 조용히 끝나버리는 구조적 허점", 이 둘은 서로 다른 문제인데 왜 둘 다 고쳐야 이번 증상이 확실히 해결될 수 있는지 설명해주실 수 있나요?
#### 답변 : 
---

### Step 12 (2026-07-10) — 공식 count_tokens API로 `/api/next-step` 실제 토큰/비용 측정 스크립트 추가

**무엇을 했는지 (한 줄)**
`hometax-guide-extension/server/count-tokens.mjs`를 새로 만들어, 지난 대화에서 문자 수 기준으로 추측했던 토큰 수를 Anthropic 공식 `count_tokens` API로 실측했습니다. `server.mjs`의 실제 `buildPrompt()`를 그대로 가져다 쓰기 때문에, 서버가 진짜로 보내는 프롬프트와 100% 동일한 프롬프트로 측정됩니다.

**핵심 코드**

```javascript
// count-tokens.mjs — server.mjs의 실제 프롬프트 생성 함수를 그대로 재사용
import { buildPrompt } from './server.mjs';

const { input_tokens } = await anthropic.beta.messages.countTokens({
  model: 'claude-sonnet-5',
  messages: [{ role: 'user', content: prompt }],
});
// ↑ 이 프로젝트가 고정한 SDK 버전(0.32.x)에서는 count_tokens가 아직
//   `client.messages.*`가 아니라 `client.beta.messages.*` 아래에 있음 —
//   최신 문서 기준 예제 코드를 그대로 쓰면 "not a function" 에러가 남
```

```javascript
// server.mjs 맨 아래 — buildPrompt를 import만 해도 서버가 같이 켜지는 버그를 막음
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => { /* ... */ });
}
// ↑ ES 모듈은 import되기만 해도 파일 맨 위부터 끝까지 코드가 실행됨.
//   이 가드가 없으면 count-tokens.mjs를 실행할 때마다 진짜 프록시 서버가
//   하나 더 뜨려고 시도하다가 "포트 4000 이미 사용 중" 에러로 죽었음
//   (실제로 처음 실행했을 때 이 에러가 남 — 이미 떠 있던 진짜 서버와 충돌).
```

**왜 이렇게 했는지**
직전 대화에서 API 비용을 "문자 수 → 토큰 수 대략 변환"으로 추정했는데, 사용자가 공식 API로 정확히 재는 방법을 요청했습니다. `buildPrompt`를 복제해서 새 스크립트에 다시 쓰면 나중에 프롬프트가 바뀔 때 측정 스크립트가 실제 서버와 어긋날 수 있어서, `export`로 노출시켜 그대로 재사용하게 했습니다. 실행해보니 `client.messages.countTokens`가 없다는 에러가 났는데, 설치된 SDK가 `0.32.1`로 예전 버전이라 이 기능이 아직 `beta` 네임스페이스에 있었던 것이었습니다 — 실제로 설치된 버전을 확인하고 고쳤습니다. 그다음 실행에서는 `EADDRINUSE`(포트 충돌) 에러가 났는데, `server.mjs`를 그냥 `import`하기만 해도 파일 맨 아래 `app.listen()`이 같이 실행돼서 이미 떠 있던 진짜 서버와 포트가 겹친 것이었습니다 — `import.meta.url` 가드를 추가해서, "직접 실행될 때만 서버가 뜨고 다른 파일이 import만 할 때는 안 뜨도록" 고쳤습니다.

---

### Step 13 (2026-07-10) — 화면 구조 변화·화면 밖 요소·iframe에 능동적으로 대응하도록 보강

**무엇을 했는지 (한 줄)**
사용자가 "화면 구조가 바뀌면 AI가 인식 못 하는 문제"와 "화면 아래(스크롤해야 보이는) 클릭 요소를 놓치는 문제"를 지적해서, 먼저 `hometax-fincert-spike/guide-matching-explore.mjs`라는 진단용 Playwright 스크립트로 실제 홈택스 화면에서 재현 확인한 뒤, `content-script.js`/`server.mjs`를 고쳤습니다.

**핵심 코드**

실측으로 확인된 문제(홈 화면 하나에서만 후보 24개 중 17개가 화면 밖이라 통째로 무시되고 있었음)를 고친 부분 — 뷰포트 안이면 기존처럼 가려짐(occlusion) 체크를 하고, 뷰포트 밖이면 그 체크를 건너뛰고 CSS 가시성만으로 포함시킵니다:

```javascript
const inViewport =
  localCx >= 0 && localCy >= 0 && localCx <= context.viewportWidth && localCy <= context.viewportHeight;

if (inViewport) {
  // elementFromPoint는 "지금 화면에 보이는 좌표"에서만 의미가 있다 — 화면 밖 좌표에 쓰면 소용없음
  const topEl = context.elementFromPointDoc.elementFromPoint(localCx, localCy);
  if (!(topEl && (el.contains(topEl) || topEl.contains(el)))) continue;
}
// 화면 밖이면 occlusion 체크 없이 그대로 후보에 포함 — offscreen: true로 표시해서 AI에게 알려줌
```

하이라이트할 때 대상이 화면 밖이면 자동으로 스크롤합니다(이후 매 프레임 위치를 다시 재므로 스크롤 애니메이션을 따라감):

```javascript
const needsScroll = rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth;
if (needsScroll) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
}
```

이름을 하드코딩하지 않고 "실제로 렌더링된" same-origin iframe을 자동으로 찾아서 같이 훑는 부분:

```javascript
const iframeRect = iframe.getBoundingClientRect();
if (iframeRect.width === 0 || iframeRect.height === 0) continue;
// ↑ txppIframe처럼 항상 크기 0(about:blank)인 빈 iframe은 이 조건 하나로 자동 제외됨 —
//   "이 이름의 iframe은 무시해라" 식으로 하드코딩할 필요가 없음
```

**왜 이렇게 했는지**
사용자가 "위치를 하드코딩하지 말고, 뭐가 있는지 확인해서 능동적으로 대응하라"고 명확히 지적했습니다. 그래서 먼저 진단 스크립트로 실측: (1) 홈 화면만으로도 전체 후보의 약 40%가 화면 밖에 있었고, (2) "화면크기130%120%..." 같이 여러 항목(줌 배율 목록)이 하나로 뭉친 가짜 라벨도 발견했습니다. `isLeafLike()`에 "자식 2개 이상이 각자 글자를 갖고 있으면 leaf가 아니다"라는 조건을 추가해 이 문제도 같이 고쳤습니다. iframe은 실측상 이번 화면들에선 실제 콘텐츠가 없었지만(`txppIframe`은 항상 빈 껍데기), 특정 iframe 이름을 하드코딩해서 제외하는 대신 "크기 0이거나 내용 없는 iframe은 자동으로 빠진다"는 일반적인 조건으로 만들어서, 나중에 다른 화면이 진짜 iframe 안에 콘텐츠를 그려도 자동으로 대응되게 했습니다.

**새로 나온 용어**
- 이번 스텝에서 새로 나온 용어는 없습니다 (elementFromPoint, occlusion 등은 이전 Step 용어집에 이미 있음).

**확인 질문**
"화면 밖 요소는 occlusion(가려짐) 체크를 건너뛴다"는 코드가 있는데, 왜 화면 밖 요소에는 애초에 그 체크를 적용할 수 없는지 설명해주실 수 있나요? (힌트: `elementFromPoint`가 좌표를 받아서 하는 일이 뭔지 떠올려보세요.)

**실측 결과 (지난 추정치와 비교)**
| 시나리오 | 지난 추정 | 이번 실측 |
|---|---|---|
| 평이한 경우 (요소 6개) | 입력 ~1,000토큰 | 입력 1,157토큰 |
| 최악의 경우 (요소 70개) | 입력 ~1,500토큰/콜 | 입력 2,866토큰/콜 |

지난 추정이 완전히 틀리진 않았지만(같은 자릿수), 실측이 대체로 더 높게 나왔습니다 — 특히 프롬프트 앞부분 고정 지시문 자체가 예상보다 토큰을 더 많이 씀.

**새로 나온 용어**
- **count_tokens API**: 실제로 텍스트를 생성하지 않고 "이 프롬프트가 토큰 몇 개인지"만 세어주는 Anthropic 공식 엔드포인트. 과금(출력 생성)이 없어서 비용 계산에 안전하게 여러 번 써볼 수 있음.
- **import 부작용(side effect)**: ES 모듈은 `import`문만 써도 그 파일의 최상위(top-level) 코드가 전부 실행됨. 함수 하나만 가져다 쓰려고 import했는데 그 파일이 서버를 띄우거나 다른 일을 저지르면, 그게 "import 부작용"임 — `import.meta.url` 가드로 "이 파일이 직접 실행됐을 때만" 그 부작용이 일어나게 막을 수 있음.

**확인 질문**
`server.mjs`에 `import.meta.url === pathToFileURL(process.argv[1]).href` 가드를 넣지 않았다면, `count-tokens.mjs`를 실행할 때마다 정확히 어떤 문제가 반복됐을지, 그리고 이 가드가 "직접 실행 vs import로 가져다 쓰기"를 어떻게 구분하는지 설명해주실 수 있나요?
#### 답변 :  하드코딩되어 화면 밖의 요소를 확인못함 
---

### Step 14 (2026-07-10) — 실제 확장 프로그램 사용량을 기록하는 usage-log 추가

**무엇을 했는지 (한 줄)**
사용자가 "방금 확장 프로그램 실제로 돌려봤는데 토큰 몇 개 썼는지 확인되냐"고 물었는데, 확인해보니 `server.mjs`가 API 응답의 `usage`(입력/출력 토큰)를 받고도 어디에도 기록하지 않고 버리고 있었습니다. 그래서 실제 호출마다 토큰 수치만 로컬 파일에 남기는 기능과, 그걸 집계해서 보여주는 `usage-report.mjs`를 추가했습니다.

**핵심 코드**

```javascript
// 프롬프트/응답 내용은 절대 남기지 않고, 토큰 수치만 한 줄씩 추가한다 (PII 없음).
async function logUsage(usage) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  });
  await appendFile(USAGE_LOG_PATH, line + '\n', 'utf-8');
  // ↑ 매번 파일을 통째로 다시 쓰지 않고 한 줄만 덧붙임(JSONL 형식) — 서버가 오래 떠 있어도 안전
}
```

```javascript
console.log(`[explain-proxy] 토큰 사용량 — 입력 ${message.usage.input_tokens} / 출력 ${message.usage.output_tokens}`);
logUsage(message.usage).catch((err) => console.error('[explain-proxy] 사용량 로그 기록 실패:', err.message));
// ↑ await 안 함(fire-and-forget) — 로그 기록이 느려지거나 실패해도 사용자에게 가는 실제 응답(res.json)은 안 늦어짐
```

**왜 이렇게 했는지**
지금까지 이 프로젝트는 "표 내용 같은 민감정보는 아예 전송/저장하지 않는다"는 원칙은 지켰지만, 그 반대급부로 "그래서 실제로 토큰을 얼마나 쓰는지"조차 아무 데도 안 남기고 있었습니다. `count-tokens.mjs`(Step 12)는 가상의 시나리오로 미리 추정만 할 뿐, 실제 확장 프로그램을 켜서 쓴 진짜 사용량은 여전히 알 수 없었습니다. 로그 기록을 `await`하지 않고 `.catch()`만 붙인 이유는, 사용자 쪽 화면 반응 속도(res.json)가 파일 쓰기 때문에 느려지면 안 되기 때문입니다 — 로그는 부가 기능이라 실패해도 본 기능(다음 클릭 안내)에 영향을 주면 안 됩니다.

**새로 나온 용어**
- **JSONL(JSON Lines)**: JSON 객체 하나를 한 줄에 하나씩 쭉 이어 쓰는 파일 형식. 배열(`[...]`)로 감싸지 않아서, 파일 전체를 다시 파싱하지 않고도 끝에 새 줄만 계속 덧붙일 수 있음(`appendFile`).
- **fire-and-forget**: 어떤 작업(여기선 로그 파일 쓰기)의 결과를 기다리지 않고 그냥 실행만 시켜두는 방식. 실패해도(`.catch()`로만 처리) 메인 흐름(사용자 응답)은 멈추지 않음.

**확인 질문**
`logUsage(message.usage)` 앞에 `await`를 안 붙이고 `.catch()`만 붙인 이유가 뭔지, 만약 여기에 `await`를 붙였다면 사용자 입장에서 어떤 차이가 생겼을지 설명해주실 수 있나요?

---

### Step 15 (2026-07-10) — "계산서·영수증·카드 클릭 후 방향 상실" 원인 분석 (코드 수정 없음, 진단만)

**무엇을 했는지 (한 줄)**
"세금계산서 발행"을 목표로 가이드를 켰는데 「계산서·영수증·카드」를 누른 직후 안내가 끊기는 문제를 진단했습니다. 코드 3개 파일(`server.mjs`, `content-script.js`)과 실제 사용 기록(`usage-log.jsonl`)을 대조해서 원인을 확정했고, 이번 스텝에서는 아무 코드도 고치지 않았습니다.

**결정적 증거 — usage-log.jsonl (실제 기록)**

```
{"ts":"...T07:25:45", "input_tokens":5014, "output_tokens":126}   ← 1턴: 정상
{"ts":"...T07:25:51", "input_tokens":5268, "output_tokens":134}   ← 2턴: 정상
{"ts":"...T07:25:59", "input_tokens":5299, "output_tokens":400}   ← 3턴: 정확히 400 = 상한선에서 잘림!
```

오늘 두 번의 가이드 세션 **둘 다** 마지막 호출의 출력이 정확히 400토큰입니다. 400은 우연이 아니라 서버가 정한 "AI 답변 최대 길이"이고, 딱 그 값에 도달했다는 건 **답변이 문장 중간에 강제로 잘렸다**는 뜻입니다.

**핵심 코드 — 문제가 만들어지는 3단계 연쇄**

1단계, `server.mjs` — AI 답변 길이를 400토큰으로 제한한 부분:

```javascript
const message = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 400,
  // ↑ "답변은 최대 400토큰까지만"이라는 상한선. 한글은 토큰을 많이 먹어서
  //   400토큰 ≈ 한글 200~300자 정도밖에 안 됨. label + message를 한글로 쓰면 금방 초과함
  messages: [{ role: 'user', content: prompt }],
});
```

2단계, `server.mjs`의 `parseJsonResponse` — 잘린 답변이 들어오면 "실패"가 아니라 **"완료"로 둔갑**시키는 부분:

```javascript
function parseJsonResponse(raw) {
  try {
    return JSON.parse(raw);
    // ↑ 잘린 JSON(예: {"index": 37, "label": "전자세금... 에서 뚝 끊긴 것)은 여기서 실패
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    // ↑ "{ 로 시작해서 } 로 끝나는 부분만이라도 건져보자"는 구조인데,
    //   중간에 잘린 답변엔 닫는 } 자체가 없어서 이것도 실패
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // 아래 폴백으로 진행
      }
    }
    return { index: null, done: true, message: raw || 'AI 응답을 이해하지 못했습니다.' };
    // ↑ 진짜 문제! "답변이 잘렸다"(오류)를 "done: true"(목표 완료)로 바꿔서 돌려줌.
    //   message엔 잘린 원문이 그대로 들어가서, 사용자에겐 뜻 모를 반토막 문장이 보임
  }
}
```

3단계, `content-script.js` — 그 "가짜 완료"를 받은 확장 프로그램이 순순히 안내를 끝내버리는 부분:

```javascript
const { index, label, done, message } = response.data || {};

if (done) {
  clearHighlight();
  // ↑ 강조 박스를 지움 — 사용자 눈엔 "갑자기 안내가 사라진" 순간
  showPanelMessage(message || '완료됐습니다.');
  // ↑ 패널에 message를 띄우는데, 2단계에서 message = 잘린 원문이므로 반토막 문장이 뜸
  finished = true;
  break;
  // ↑ 루프 종료. 이후 아무 일도 안 일어남 = "방향을 못 잡는" 상태의 정체
}
```

실제로 2단계 함수에 "잘린 JSON"을 넣어 재현 테스트를 해봤고, 정확히 `{index: null, done: true, message: <잘린 원문>}`이 나오는 것을 확인했습니다.

**왜 하필 「계산서·영수증·카드」 클릭 직후에 터지는가**

- 그 메뉴를 열면 화면에 클릭 후보가 폭증합니다(입력 토큰이 매 턴 5,000대 = 후보 수집 상한선 120개 근처까지 찬 상태). 게다가 "세금계산서 발행"은 개인 인증서 계정에서는 실제로 막혀 있는 목표라(사업자 인증서 필요 — Step 3 이전 기록 참고), AI가 "명확한 다음 버튼"을 못 고르고 **설명이 길어지기 쉬운 상황**입니다. 답이 길어질수록 400토큰 상한에 걸릴 확률이 올라가고, 걸리는 순간 위 3단계 연쇄가 발동합니다.
- 참고로 후보 목록이 120개에서 잘리는 것도 별개의 잠재 문제입니다 — 문서 순서상 앞쪽 120개만 AI에게 전달되므로, 정작 필요한 하위 메뉴가 목록에 아예 못 들어갔을 가능성도 있습니다(이번 증거로는 확정 불가, 로그에 요소 목록이 안 남아서).

**새로 나온 용어**
- **max_tokens (맥스 토큰)**: AI에게 "답변을 최대 이 길이까지만 만들어라"라고 정하는 상한선. 상한에 닿으면 AI가 말을 "다 끝내고" 멈추는 게 아니라 문장 중간이라도 뚝 끊김.
- **stop_reason (스톱 리즌)**: AI 응답에 같이 딸려오는 "내가 왜 말을 멈췄는지" 표시. 정상 종료면 `end_turn`, 길이 상한에 걸려 잘렸으면 `max_tokens`가 옴. 지금 서버 코드는 이 값을 확인하지 않아서 "잘림"과 "정상"을 구분하지 못함.

**확인 질문**
usage-log에 찍힌 `output_tokens: 400`이라는 숫자 하나만 보고 "답변이 잘렸다"고 확신할 수 있었던 이유가 뭘까요? (힌트: 400이라는 숫자가 서버 코드 어디에 적혀 있는지 떠올려보세요.)
#### 답변 : 4번대 숫자는 잘못됐을때 돌려주는 숫자임 404 not found 처럼 (다시 설명 필요)
> 다시 설명: 여기의 400은 404(Not Found) 같은 HTTP 오류 코드가 아니에요. `server.mjs`에 우리가 직접 적어둔 `max_tokens: 400`(답변 최대 길이)과 **숫자가 정확히 일치**한다는 게 근거였습니다. 비유하면 "원고지 400자 제한 백일장에서 제출작이 정확히 400자로 끝났다면, 하고 싶은 말이 마침 400자였던 게 아니라 지면이 모자라 끊겼을 가능성이 매우 높다"는 논리입니다. 만약 상한이 500이었다면 로그에도 500이 찍혔을 거예요 — 오류 코드가 아니라 "우리가 정한 상한선에 정확히 닿았다"는 신호입니다.


---

### Step 16 (2026-07-10) — 크롬 확장 프로그램 전체 구조 해설: 어떤 원리로 "다음에 누를 버튼"을 알려주는가 (코드 수정 없음, 해설만)

**무엇을 했는지 (한 줄)**
`hometax-guide-extension/`을 이루는 부품 5개(manifest.json, popup/, content-script.js, background.js, server/server.mjs)가 각각 무슨 역할이고, "환급금 조회하고 싶어"라는 목표 한 줄이 어떻게 화면 위 강조 박스가 되어 돌아오는지 전체 여정을 코드 단위로 정리했습니다. 이번 스텝에서 고친 코드는 없습니다.

**큰 그림 — 등장인물 4명과 역할 분담**

```
[① 팝업]            [② 콘텐츠 스크립트]         [③ 백그라운드]        [④ 프록시 서버]        [Claude AI]
목표를 입력받음 ──▶ 화면을 "목록"으로 만듦 ──▶ 서버로 전달만 함 ──▶ 프롬프트로 조립 ──▶ "N번 눌러" 판단
                    ▲ N번 요소를 강조하고                                                      │
                    │ 사람이 클릭할 때까지 대기 ◀────── JSON 응답이 왔던 길 그대로 회신 ◀──────┘
                    └─ 사람이 클릭하면 → 다시 화면을 목록으로 만들어 반복 (최대 12턴)
```

역할 분담의 원칙: **AI는 "고르기"만, 확장 프로그램은 "보여주기"만, 클릭은 항상 "사람"만.** 그리고 AI는 홈택스 화면을 직접 보는 게 아니라, 확장 프로그램이 만들어준 "번호 붙은 글자 목록"만 봅니다.

**핵심 코드 — 목표 한 줄이 강조 박스가 되기까지의 여정**

출발점 `manifest.json` — 어떤 파일을 어디에 심을지 크롬에게 알려주는 설계도:

```json
"content_scripts": [
  {
    "matches": ["https://www.hometax.go.kr/*", "https://hometax.go.kr/*"],
    "js": ["content-script.js"],
    "run_at": "document_idle"
  }
]
```

↑ "홈택스 주소의 페이지가 열리면 그 페이지 안에 content-script.js를 자동으로 심어라"는 선언입니다. 덕분에 ②번 등장인물은 홈택스 화면의 요소들을 직접 읽고 그 위에 그림을 그릴 수 있습니다.

①→② `popup/popup.js` — 사용자가 입력한 목표를 홈택스 탭 안의 콘텐츠 스크립트에게 전달:

```javascript
await chrome.tabs.sendMessage(tab.id, { type: 'START_GUIDE', goal });
// ↑ 팝업은 홈택스 화면을 직접 못 건드림. 대신 "지금 열린 그 탭"에게
//   "START_GUIDE라는 종류의 편지 + 목표 문장"을 보냄 (크롬의 메시지 패싱 기능)
```

② `content-script.js` — 이 확장 프로그램의 심장인 12턴 루프. 매 턴 "화면 직렬화 → AI에게 질문 → 강조 → 사람 클릭 대기"를 반복:

```javascript
for (let turn = 0; turn < MAX_TURNS; turn++) {
  const elements = serializeInteractiveElements();
  // ↑ [눈] 지금 화면의 클릭 가능한 요소를 전부 훑어서 {번호, 글자, 역할} 목록으로 만듦.
  //   진짜 DOM 요소는 elementRegistry라는 로컬 배열에만 보관하고, AI에게는
  //   "37: '환급금 상세조회' (a)" 같은 글자만 보냄 — 화면 내용 자체는 밖으로 안 나감
  const response = await askLlmForNextStep(goal, elements, history);
  // ↑ [질문] 목표 + 목록 + 지금까지 클릭한 이력을 ③번(백그라운드)에게 던지고 답을 기다림

  const { index, label, done, message } = response.data || {};

  if (done) {
    clearHighlight();
    showPanelMessage(message || '완료됐습니다.');
    finished = true;
    break;
    // ↑ AI가 "목표 달성됨"이라 판단하면 여기서 안내 종료 (Step 15의 사고도 이 문을 통해 일어났음)
  }

  const target = typeof index === 'number' ? elementRegistry[index] : null;
  // ↑ [번호→실물 변환] AI가 답한 번호(index)를 아까 보관해둔 대응표에서 진짜 화면 요소로 되찾음.
  //   AI는 번호만 알고, 번호와 실물을 잇는 열쇠는 항상 이쪽(브라우저 안)에만 있음

  highlightElement(target, label || '이 버튼을 클릭하세요');
  // ↑ [보여주기] 그 요소 위에 하늘색 강조 박스 + 말풍선을 그림 (클릭은 안 함!)

  await waitForRealClick(target);
  // ↑ [사람 차례] 사용자가 그 요소를 진짜로 클릭할 때까지 코드가 이 줄에서 멈춰서 기다림

  history.push(label || target.textContent.trim());
  await new Promise((resolve) => setTimeout(resolve, 1200));
  // ↑ 클릭 후 홈택스가 새 화면을 그릴 시간을 1.2초 준 뒤, 다음 턴에서 처음부터 다시 훑음
}
```

②→④ `background.js` — 콘텐츠 스크립트의 질문을 로컬 서버로 중계하는 우체부:

```javascript
fetch(`${PROXY_URL}/api/next-step`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    goal: message.goal,
    // ... (목록, 이력 등 나머지 재료도 그대로 담아서)
  }),
})
  .then((res) => res.json())
  .then((data) => sendResponse({ ok: true, data }))
// ↑ 하는 일은 정말 "전달"뿐. 그런데도 이 단계가 따로 있는 이유는 Claude API 키를
//   브라우저(확장 프로그램) 쪽에 절대 두지 않기 위해서 — 키는 ④번 서버의 .env에만 있고,
//   확장 프로그램은 localhost:4000 주소만 알면 됨
```

④ `server/server.mjs` — 받은 재료를 프롬프트(AI에게 주는 지시문)로 조립해서 Claude에 질문:

```javascript
const elementLines = elements
  .map((e) => `${e.index}: "${e.text}" (${e.role}${e.offscreen ? ', 지금 화면 밖 — 스크롤해야 보임' : ''})`)
  .join('\n');
// ↑ {번호, 글자, 역할} 목록을 "37: '환급금 상세조회' (a)" 같은 글줄로 펼침 —
//   AI가 보는 "화면"의 전부가 이 글줄들임. 화면을 보는 게 아니라 이 목록을 "읽는" 것

const message = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  max_tokens: 400,
  messages: [{ role: 'user', content: prompt }],
});
// ↑ 여기가 실제 AI 호출. 프롬프트 끝에 "반드시 {"index":숫자, "label":..., "done":..., "message":...}
//   JSON으로만 답해라"라고 못 박아서, 돌아온 답을 기계가 바로 읽을 수 있게 함
//   (Step 15에서 본 400토큰 상한도 바로 이 줄)
```

이 JSON이 ④→③→②로 되돌아가면, ②의 루프가 `elementRegistry[index]`로 실물 버튼을 되찾아 강조 박스를 그립니다 — 여기까지가 한 턴이고, 사람이 클릭하면 같은 여정이 다시 시작됩니다.

**왜 이렇게 4명으로 쪼갰는지 (설계 원리 3줄 요약)**
1. **판단과 실행의 분리**: "어디를 누를지"는 AI가, "실제 클릭"은 사람이 — 세무 사이트에서 프로그램이 임의로 클릭하지 않는다는 이 저장소의 안전 원칙(Step 7 피벗의 이유) 그대로입니다.
2. **비밀(API 키)의 격리**: 키가 필요한 일(④)과 화면을 만지는 일(②)을 물리적으로 다른 프로세스에 둬서, 확장 프로그램 파일을 뜯어봐도 키가 나오지 않습니다.
3. **정보 최소 전송**: AI에게는 "버튼 글자 목록"만 나가고, 화면의 표 내용(환급금 금액 등)은 건수(resultRowCount) 숫자 하나로만 요약돼 나갑니다 — 개인정보가 프롬프트에 실리지 않게.

**새로 나온 용어**
- **메시지 패싱(message passing)**: 크롬 확장 프로그램의 부품들(팝업/콘텐츠 스크립트/백그라운드)은 서로 격리된 공간에서 돌아가서 함수를 직접 못 부르고, `sendMessage`로 "편지"를 주고받아야만 대화할 수 있음. `{ type: 'START_GUIDE', ... }`처럼 편지에 종류(type)를 적어 구분함.
- **직렬화(serialize)**: 화면 요소처럼 "그 자리에서만 존재하는 것"을 네트워크로 보낼 수 있는 글자/숫자 목록으로 바꾸는 일. 여기서는 DOM 요소 → `{index, text, role}` 목록 변환이 직렬화이고, 되돌리는 열쇠(elementRegistry)는 보내지 않고 로컬에만 둠.

**확인 질문**
AI는 홈택스 화면을 한 번도 직접 보지 못하는데, "37번을 눌러라"라는 답이 어떻게 실제 화면의 정확한 버튼 강조로 이어질까요? 번호와 실물 버튼을 연결해주는 것이 무엇이고, 그것이 왜 서버가 아니라 브라우저 쪽에만 보관되는지 설명해보시겠어요?
#### 답변 : 일단 브라우저에 API 키를 두면 안되니깐 로컬서버로 들어가고 화면을 내용을 목록화하여 ai에게 입력함 (애매함)
> 보충: "화면을 목록화해서 AI에게 보낸다"와 "키는 서버에만 둔다"는 정확히 맞습니다. 다만 질문의 핵심이었던 **번호↔실물 연결 고리**는 `elementRegistry`라는 배열이에요 — 목록을 만들 때 "37번 = 이 실제 버튼"이라는 대응표를 콘텐츠 스크립트가 자기 손에만 들고 있고, AI에겐 번호+글자만 보냅니다. 이 대응표가 브라우저에만 있어야 하는 이유는 키 보안 때문이 아니라, **DOM 요소(실물 버튼)는 그 페이지 안에서만 존재하는 물건이라 서버로 보낼 방법 자체가 없기 때문**입니다 — 극장 좌석(실물)은 우편으로 부칠 수 없고 좌석번호(글자)만 부칠 수 있는 것과 같아요. 그래서 AI가 "37번"이라고 답장을 보내면, 좌석표를 들고 있는 극장 직원(콘텐츠 스크립트)만이 그 번호를 실제 좌석으로 안내할 수 있는 구조입니다.

---

### Step 17 (2026-07-10) — 콘텐츠 스크립트는 어떻게 화면을 "목록"으로 만드는가: DOM 질의의 원리 (코드 수정 없음, 해설만)

**무엇을 했는지 (한 줄)**
Step 16의 "화면을 목록으로 만듦"이 실제로 어떻게 이루어지는지 질문("크롬으로 홈택스를 띄운 HTML이랑 JS를 DOM 사용해서 해석하는 거임?")을 받아서, `content-script.js`의 `serializeInteractiveElements()`가 화면 요소를 가져오는 원리를 코드 단위로 해설했습니다. 이번 스텝에서 고친 코드는 없습니다.

**전제 — DOM은 "HTML 파일"이 아니라 "브라우저가 지어놓은 건물"**

질문에 대한 답은 **절반만 맞음**입니다. 순서대로:

1. 크롬이 홈택스 서버에서 HTML **원문(글자)** 을 내려받음 — 이건 설계도면일 뿐.
2. 크롬이 그 도면을 읽어 메모리에 **DOM 트리**라는 실제 구조물을 지음 (버튼 하나 = 노드 하나).
3. 홈택스 자체 JS(WebSquare)가 그 구조물을 계속 증축/리모델링함 — 메뉴를 열면 새 노드가 생기고 화면을 전환하면 통째로 갈림. **그래서 최종 화면은 HTML 원문과 전혀 다름.**

콘텐츠 스크립트는 HTML 원문도, 홈택스 JS 코드도 읽지 않습니다. 홈택스 JS가 일한 **결과물인 현재 시점의 DOM**을, 같은 페이지에 입주한 손님으로서 직접 둘러보는 겁니다. 비유하면: 요리사(홈택스 JS)의 레시피(HTML/JS 원문)를 읽는 게 아니라, 완성돼 나온 **접시(DOM)** 를 보고 "지금 접시에 뭐가 올라가 있나" 목록을 적는 것. 루프가 클릭 후 1.2초를 기다리는(`setTimeout(resolve, 1200)`) 이유도 이것 — 요리가 아직 안 나왔는데 접시를 보면 빈 목록이 나오니까요.

**핵심 코드 — "목록 만들기" = 4단계 면접 심사**

① 후보 소집 — 브라우저에게 "이런 태그 전부 데려와" (`content-script.js`):

```javascript
const CLICKABLE_SELECTOR = 'button, a, [role="button"], [role="tab"], span, div, td, li, label';
```
```javascript
const candidates = context.root.querySelectorAll(CLICKABLE_SELECTOR);
// ↑ querySelectorAll = "지금 DOM 트리에서 이 조건에 맞는 노드 전부 줘"라는 표준 질의.
//   HTML 원문 검색이 아니라, 홈택스 JS가 방금 만든 요소까지 포함된 '현재 상태' 검색
```

② 서류 심사 — 글자가 있는 후보만 통과:

```javascript
for (const el of candidates) {
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  // ↑ 그 노드에 쓰여 있는 글자를 꺼내고 공백을 정리함
  if (!text || text.length > 60) continue;
  // ↑ 글자가 없거나 너무 길면(버튼일 리 없음) 탈락
  if (!isLeafLike(el)) continue;
  // ↑ 같은 글자를 가진 자식을 감싸기만 하는 '포장지'면 탈락 — 같은 버튼이 두 번 잡히는 걸 방지
```

③ 실물 확인 — 여기가 "해석"이 아니라 "측정"인 부분. 렌더링 결과를 브라우저에게 물어봄:

```javascript
  const rect = el.getBoundingClientRect();
  // ↑ "이 요소가 화면 어느 좌표에, 얼마 크기로 그려져 있어?" (그려진 결과를 측정)
  const style = getComputedStyle(el);
  // ↑ "CSS를 전부 계산한 최종 결과로, 이 요소 숨김 처리돼 있어?"
  const visible =
    rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  if (!visible) continue;
```
```javascript
    const topEl = context.elementFromPointDoc.elementFromPoint(localCx, localCy);
    if (!(topEl && (el.contains(topEl) || topEl.contains(el)))) continue;
    // ↑ "그 좌표에서 맨 위에 보이는 게 진짜 얘 맞아?" — 팝업 뒤에 가려진 유령 후보 탈락
```

④ 번호표 발급 — 합격자만 목록에 올림:

```javascript
  const index = elementRegistry.length;
  elementRegistry.push(el);
  // ↑ 실물(DOM 노드 자체)은 브라우저 안의 대응표에만 보관 — 밖으로 안 나감
  list.push({ index, text, role: el.getAttribute('role') || el.tagName.toLowerCase(), offscreen: !inViewport });
  // ↑ AI에게 보낼 건 {번호, 글자, 역할, 화면밖 여부}뿐 — 이 변환이 Step 16에서 말한 "직렬화"
```

**한 가지 더 — 같은 방을 쓰지만 서로의 짐은 못 봄**
콘텐츠 스크립트는 홈택스 페이지와 **DOM은 공유하지만 JS 변수는 격리**됩니다(크롬이 "격리된 세계"라는 칸막이를 쳐줌). 그래서 홈택스 JS의 내부 데이터를 들여다볼 수는 없고, 오직 화면에 실제로 그려진 것만 볼 수 있습니다 — 이 확장 프로그램엔 오히려 딱 맞는 제약입니다("사람 눈에 보이는 것만 AI에게 전달"하는 원칙과 일치).

**새로 나온 용어**
- **DOM(문서 객체 모델)**: 브라우저가 HTML 원문을 읽어 메모리에 지어놓은 살아있는 화면 구조물. JS가 계속 고칠 수 있어서 최종 상태는 HTML 원문과 다를 수 있음.
- **querySelectorAll**: "이 조건에 맞는 요소 전부 달라"고 DOM에 질의하는 브라우저 표준 기능. CSS 선택자 문법(`button, a, ...`)으로 조건을 씀.
- **격리된 세계(isolated world)**: 콘텐츠 스크립트가 페이지와 DOM은 공유하되 JS 변수·함수는 서로 못 보게 크롬이 쳐주는 칸막이.

**확인 질문**
`querySelectorAll`로 잡은 후보를 그대로 다 AI에게 보내지 않고 ②~③ 심사(글자 확인, 크기/숨김/가려짐 측정)를 거치는 이유가 뭘까요? 심사 없이 전부 보낸다면 어떤 문제가 생길지 두 가지만 말씀해보시겠어요? (힌트: 하나는 비용, 하나는 정확도와 관련 있습니다.)
#### 답변 : 입력 토큰이 불필요하게 늘어남 , 일차적으로 기계적으로 거를 수 있는 요소는 걸러서 AI에 전달해야 불필요한 컨텍스트가 들어가는 것을 막음. (애매함)
> 보충: 비용 쪽(불필요한 입력 토큰/컨텍스트)은 정확히 맞습니다. 두 번째로 기대했던 답은 **정확도**였어요 — 심사 없이 보내면 화면에 안 보이거나 다른 팝업에 가려진 요소도 목록에 섞이는데, AI가 하필 그걸 "다음에 누르세요"라고 고르면 강조 박스가 빈 곳/가려진 곳을 가리키게 됩니다. 즉 심사는 토큰 절약이면서 동시에 "AI가 고른 건 사용자가 실제로 클릭할 수 있는 것"이라는 보장이기도 합니다.

---

### Step 18 (2026-07-10) — Step 15에서 찾은 "잘림→가짜 완료" 버그 수정

**무엇을 했는지 (한 줄)**
`server.mjs`에 세 가지 작은 수정을 적용했습니다: (1) AI 답변 길이 상한을 400→1,000토큰으로 올리고, (2) 상한에 걸려 잘린 응답을 "완료"로 위장하지 않고 정직한 안내로 바꾸는 가드를 추가하고, (3) 프롬프트에 "짧게 답하라"는 지시를 넣었습니다.

**핵심 코드**

수정 1+2 — 상한 인상과 `stop_reason` 가드 (`server.mjs`):

```javascript
const message = await anthropic.messages.create({
  model: 'claude-sonnet-5',
  // 상한일 뿐 실제 생성된 토큰만 과금됨 — 400은 한글 label+message가 잘리는 사고가 실측으로 확인돼 여유 있게 올림
  max_tokens: 1000,
  // ↑ 수정 1: 상한을 올려도 평소 응답(126~200토큰)이 그대로면 비용은 안 늘어남 — 잘릴 확률만 낮아짐
  messages: [{ role: 'user', content: prompt }],
});
```

```javascript
// 길이 상한에 걸려 잘린 응답은 JSON이 깨져 있음 — "완료"로 위장하지 말고 정직한 안내로 응답한다.
if (message.stop_reason === 'max_tokens') {
  // ↑ 수정 2의 핵심: API 응답에 딸려오는 "내가 왜 멈췄는지"(stop_reason)를 드디어 확인함.
  //   'max_tokens' = 상한에 걸려 문장 중간에 잘렸다는 뜻 (정상 종료는 'end_turn')
  console.warn('[explain-proxy] 응답이 max_tokens 상한에서 잘렸습니다 — 잘린 내용은 버리고 안내 메시지로 대체');
  return res.json({
    index: null,
    done: false,
    message: 'AI 답변이 길이 제한에 걸려 중간에 잘렸어요. 가이드를 다시 시작해주세요.',
    // ↑ Step 15의 버그였던 "done: true + 잘린 원문"(가짜 완료 + 뜻 모를 반토막 문장) 대신,
    //   done: false + 사람이 읽을 수 있는 안내를 보냄. 잘린 원문은 파싱 시도조차 하지 않고 버림
  });
}

res.json(parseJsonResponse(raw));
// ↑ 가드를 통과한(= 정상 종료된) 응답만 여기로 내려와서 JSON 파싱을 시도함
```

수정 3 — 프롬프트에 길이 지시 추가 (애초에 답이 길어질 확률 자체를 낮춤):

```
반드시 아래 JSON 형식으로만, 다른 설명 없이 응답하세요. label은 한 문장, message는 최대 두 문장으로 짧게 쓰세요:
```

**왜 이렇게 했는지**
Step 15에서 확정한 원인이 "400토큰 상한에서 잘린 JSON → 파싱 실패 → done:true로 둔갑"의 3단 연쇄였습니다. 수정 1(상한 인상)과 3(짧게 답하라)은 잘림을 드물게 만들고, 수정 2(가드)는 그래도 잘리는 경우에 사고를 완료로 위장하는 경로를 구조적으로 차단합니다. 숫자만 올리면 버그가 "드물어질" 뿐이라 셋 중 수정 2가 본질입니다. `max_tokens`는 상한이지 구매량이 아니어서 1,000으로 올려도 평소 비용은 그대로입니다.

문법 검증(`node --check`)은 통과했습니다. **단, 현재 포트 4000에 떠 있는 프록시 서버는 옛 코드로 돌고 있어서 재시작해야 반영됩니다** — Step 10에서 배운 것과 같은 원리(이미 떠 있는 프로세스는 파일 수정을 다시 읽지 않음)입니다.

**새로 나온 용어**
- 이번 스텝에서 새로 나온 용어는 없습니다 (max_tokens, stop_reason 모두 Step 15 용어집에 있음).

**확인 질문**
`max_tokens`를 400에서 1,000으로 올렸는데 왜 평소 API 비용은 거의 그대로일까요? 그리고 상한을 아무리 올려도 수정 2(stop_reason 가드)가 여전히 필요한 이유는 뭘까요?
#### 답변 : 바뀌어도 평균적으로 출력하는게 비슷비슷하니깐 

---

### Step 19 (2026-07-10) — "단선적·확률적 동작" 개선 1단계: AI에게 가는 입력을 결정적으로

**무엇을 했는지 (한 줄)**
가이드가 단선적으로 움직이고 답변이 매번 달라지는 문제의 1단계 수정으로, `content-script.js`·`background.js`·`server.mjs`를 고쳐 (1) 고정 1.2초 대기를 "화면 렌더링이 실제로 끝날 때까지 기다리기"로 교체하고, (2) "직전 클릭으로 화면이 바뀌었는지"를 AI에게 알려주는 피드백을 추가하고, (3) 120개 캡에서 목표 관련 메뉴가 잘려나가지 않게 우선 포함시켰습니다.

**핵심 코드**

수정 1 — 화면 안정화 감지 (`content-script.js`). AI 모델은 그대로여도, 매번 "완성된 화면"이라는 같은 조건의 입력을 주면 답이 훨씬 일정해집니다:

```javascript
function waitForScreenSettle({ quietMs = 600, maxWaitMs = 5000 } = {}) {
  return new Promise((resolve) => {
    let quietTimer = null;
    const observer = new MutationObserver(restartQuietTimer);
    // ↑ MutationObserver = "화면(DOM)에 변화가 생기면 알려줘"라고 등록하는 브라우저 기능 (Step 7 용어집)
    const maxTimer = setTimeout(finish, maxWaitMs);
    // ↑ 시계처럼 끝없이 변하는 요소 때문에 영원히 안 끝나는 경우의 안전장치 (최대 5초)

    function finish() {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    }
    function restartQuietTimer() {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quietMs);
      // ↑ 변화가 감지될 때마다 0.6초 타이머를 다시 시작 — "0.6초 동안 아무 변화 없음" = 렌더링 끝
    }

    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    restartQuietTimer();
  });
}
```

수정 2 — 화면 변화 피드백 (같은 파일, 루프 안). 이게 "단선적" 문제의 핵심 처방입니다:

```javascript
const textSet = new Set(elements.map((e) => e.text));
let screenChanged = null; // 첫 턴은 비교 대상이 없음
let newElementTexts = [];
if (prevTextSet) {
  newElementTexts = [...textSet].filter((t) => !prevTextSet.has(t)).slice(0, 10);
  // ↑ 직전 턴에는 없었는데 이번에 새로 나타난 글자들 — "클릭의 결과물"을 AI에게 보여줌
  const removedCount = [...prevTextSet].filter((t) => !textSet.has(t)).length;
  screenChanged = newElementTexts.length > 0 || removedCount > 0;
  if (history.length > 0) history[history.length - 1].screenChanged = screenChanged;
  // ↑ 직전에 클릭한 항목에 "그 클릭이 효과가 있었는지"를 뒤늦게 채워 넣음 —
  //   이제 이력이 "전체메뉴 (화면 바뀜) → 계산서·영수증·카드 (화면 그대로)"처럼 보임
}
prevTextSet = textSet;
```

수정 3은 `serializeInteractiveElements(goal)`이 목표를 2글자 조각(2-gram)으로 쪼개 겹치는 요소를 120개 캡보다 먼저 확보하는 내용이고, `server.mjs` 프롬프트에는 "화면이 안 바뀌었으면 같은 요소를 다시 고르지 말고, 두 번 연속 진전이 없으면 중단하고 설명하라"는 판단 규칙을 추가했습니다 — 비교적 단순해서 코드는 생략했어요 (궁금하면 말씀해주세요).

**왜 이렇게 했는지**
"확률적"의 원인 중 우리가 통제할 수 있는 건 AI 자체의 무작위성이 아니라 **입력의 무작위성**이었습니다. 고정 1.2초 대기는 어떤 턴은 반쯤 그려진 화면을, 어떤 턴은 완성된 화면을 캡처해서 같은 상황에 매번 다른 목록을 만들었습니다. "단선적"의 원인은 클릭의 결과(화면 변화 여부)가 AI에게 전혀 전달되지 않아 같은 자리를 맴돌아도 감지할 수 없었던 것이고요. 검증: 세 파일 문법 체크 통과, `buildPrompt`가 옛 형식(count-tokens.mjs)과 새 형식 둘 다 올바르게 렌더링하는 것을 실행으로 확인했습니다. 2단계(성공 경로 캐시)와 3단계(JSON 스키마 강제)는 이번 범위에서 뺐습니다.

**새로 나온 용어**
- **2-그램(2-gram)**: 글자를 2개씩 겹치게 자른 조각("세금계산서"→세금/금계/계산/산서). 문구가 정확히 일치하지 않아도 관련성을 대략 잡아내는 가장 단순한 방법.

**확인 질문**
AI 모델은 하나도 안 바꿨는데, 왜 "고정 1.2초 대기 → 화면 안정화 감지" 교체가 답변의 무작위성을 줄여줄까요? (힌트: 같은 질문이라도 매번 다른 자료를 주면서 물어보면 어떻게 될지 생각해보세요.)
#### 답변 : 화면 랜더링이 완벽하게 되지 않은 상태에서 ai에게 입력을 하면 입력의 무작위성이 발생하여 이러한 입력이 출력을 비결정론적으로 바꾼다. 

---

### Step 20 (2026-07-14) — ledger-automation에 "JS + @ts-check" 타입 안전망 소급 적용 + 전표 REST API(server.mjs) 구현

**무엇을 했는지 (한 줄)**
`ledger-automation/`의 기존 모듈 전부(src 7개·test 6개·seed)에 `// @ts-check` + JSDoc 타입 주석을 소급 적용하고, 구현계획 Step 5에 해당하는 `server.mjs`(전표 REST API)와 통합테스트(`test/server.test.mjs`)를 새로 작성했습니다. 테스트 36개 전부 통과, `npm run typecheck`(tsc) 0 에러.

**핵심 아이디어 — TS로 갈아타지 않고 타입 검사만 얻기**

파일은 전부 그대로 `.mjs`(빌드 없이 바로 실행)인데, 파일 첫 줄에 `// @ts-check`를 붙이면 TypeScript 검사기가 주석에 적힌 타입을 읽어 에디터/CI에서 검사해줍니다. 타입은 코드가 아니라 **주석**에 삽니다:

```javascript
// @ts-check  ← 이 파일을 타입 검사 대상으로 지정 (실행에는 아무 영향 없음)

/**
 * @typedef {'asset' | 'liability' | 'equity' | 'revenue' | 'expense'} AccountType
 *   ↑ "이 다섯 문자열 중 하나만 허용"이라는 유니온 타입 — 오타('aset')를 에디터가 즉시 잡아줌
 * @typedef {{ code: string, name: string, type: AccountType, ... }} Account
 */

/** @type {Account[]} */
export const ACCOUNTS = [ ... ];
// ↑ 이 주석 덕분에 배열 안에 잘못된 계정 객체를 넣으면 저장하는 순간 빨간 줄
```

**핵심 코드 1 — "신뢰할 수 없는 입력은 unknown" (validate.mjs / store.mjs)**

```javascript
/**
 * @param {unknown} entry HTTP 등 신뢰할 수 없는 입력이므로 unknown으로 받아 런타임에 좁힌다
 */
export function validateEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['전표는 객체여야 합니다'];
  }
  // ↑ unknown 타입은 "정체불명"이라 이런 검사를 거치기 전에는 속성 접근 자체가 타입 오류.
  //   즉 "검증 없이 쓰면 컴파일러가 막는다" — 런타임 검증과 타입이 같은 방향을 가리키게 됨
```

```javascript
export async function addEntry(input, file = dataFile()) {
  const errors = validateEntry(input);
  if (errors.length > 0) throw new ValidationError(errors);
  const valid = /** @type {EntryInput} */ (input);
  // ↑ 캐스트(형 단언)는 여기 딱 한 곳 — "validateEntry를 통과했으니 이제 EntryInput으로 믿는다"는
  //   선언이고, 이 줄 이후로는 valid.date 등 접근이 전부 타입 검사를 받음
```

**핵심 코드 2 — Step 5: 전표 REST API (server.mjs, 새 파일)**

```javascript
// 테스트에서 listen 없이 앱만 만들어 쓸 수 있도록 생성 함수를 분리한다.
export function createApp() {
  const app = express();
  app.use(express.json());                              // JSON 요청 본문 파싱
  app.use(express.static(path.join(root, 'public')));   // Step 7에서 만들 웹 UI 자리

  app.post('/api/entries', async (req, res, next) => {
    try {
      res.status(201).json(await addEntry(req.body));
      // ↑ 201 Created — "새 자원이 만들어졌다"는 HTTP 규약. 검증→저장은 전부 store.mjs 재사용
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ errors: err.errors });
        // ↑ 잘못된 전표는 400 Bad Request + 오류 목록 — UI가 이 배열을 그대로 표시하면 됨
        return;
      }
      next(err); // 검증 오류가 아닌 진짜 사고(디스크 오류 등)는 익스프레스 기본 처리로
    }
  });
  // ... GET /api/accounts, GET /api/entries, DELETE /api/entries/:id 동일 패턴
  return app;
}

// node server.mjs로 직접 실행했을 때만 listen — 테스트가 import할 때는 실행되지 않는다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // ↑ Step 12에서 배운 "import 부작용" 방지 가드와 같은 원리
```

통합테스트는 `createApp().listen(0)`(0번 포트 = 비어 있는 포트 아무거나)으로 진짜 서버를 띄우고 Node 내장 `fetch`로 실제 HTTP 요청을 보내 검증합니다 — 잘못된 전표 400, 정상 201→목록→삭제 204→재삭제 404 라운드트립. 데이터 파일은 `LEDGER_DATA_FILE` 환경변수로 임시 폴더로 돌려서 실데이터를 건드리지 않습니다.

**왜 이렇게 했는지**
- TS 전환 대신 @ts-check를 택한 이유: 이 모듈의 장점이 "빌드 스텝 0"인데 TS는 빌드/러너 레이어가 생김. 전표는 어차피 HTTP로 들어와 런타임 검증이 필수라 컴파일 타임 타입만으로는 안전이 완성되지 않음 — @ts-check는 빌드 없이 에디터 타입 검사의 8할을 줌.
- 검사를 에디터에만 맡기지 않고 `npm run typecheck`(`tsc -p jsconfig.json`, devDependency)를 추가한 이유: 사람마다 에디터가 다르고, CI/커밋 전에 기계적으로 확인할 방법이 필요해서. **런타임 의존성은 여전히 express·exceljs 2개** — typescript는 검사 도구라 실행 시엔 전혀 안 쓰임.
- 소급 적용 중 테스트의 잠재 버그 3곳도 드러남: `find()` 결과를 널 검사 없이 쓰던 곳(`bank.debitBalance` 등) — 타입 검사기가 "undefined일 수 있다"고 지적해서 `bank?.debitBalance`로 보강. **타입을 붙이는 행위 자체가 코드 리뷰가 됨**을 보여주는 사례.

**새로 나온 용어**
- **@ts-check**: JS 파일 첫 줄에 붙이는 주석 지시자. 그 파일만 TypeScript 검사기의 검사 대상이 됨 — 코드는 JS 그대로, 검사만 추가.
- **JSDoc 타입 주석**: `/** @param {string} code */`처럼 주석 안에 타입을 적는 표준 문법. TS 검사기가 이걸 진짜 타입처럼 읽음.
- **unknown 타입**: "정체를 모르니 검사 전에는 아무것도 하지 마라"는 타입. 외부 입력(HTTP body 등)에 붙이면 검증 없이 쓰는 실수를 컴파일 단계에서 차단.
- **tsc --noEmit (typecheck)**: TypeScript 컴파일러를 "파일 생성 없이 검사만" 모드로 돌리는 것. 빌드 산출물이 없으므로 실행 코드는 여전히 원본 .mjs.
- **listen(0) / 임시 포트**: 서버를 0번 포트로 열면 OS가 비어 있는 포트를 골라줌 — 테스트끼리 포트 충돌이 안 남.

**확인 질문**
`addEntry`의 입력을 `unknown`으로 선언한 덕분에, `validateEntry` 호출을 깜빡하고 `input.date`를 바로 쓰는 코드를 작성하면 무슨 일이 벌어질까요? 그리고 `/** @type {EntryInput} */ (input)` 캐스트를 검증 **전**으로 옮겨버리면 이 안전망이 어떻게 되는지도 설명해보시겠어요?

---

### Step 21 (2026-07-14) — Step 6: Excel 결산보고서 렌더러(excel.mjs) + /api/export.xlsx + 라운드트립 테스트

**무엇을 했는지 (한 줄)**
`src/excel.mjs`(시트 3장 — 합계잔액시산표/재무상태표/손익계산서 — 을 그리는 exceljs 렌더러)와 `server.mjs`의 `GET /api/export.xlsx` 다운로드 라우트를 새로 만들고, **라운드트립 테스트**(내가 만든 엑셀 버퍼를 다시 파싱해서 셀 값 = 계산 결과인지 확인)로 검증했습니다. 테스트 43개 통과, typecheck 0 에러, 실제 서버에서 9.7KB xlsx 다운로드까지 확인.

**핵심 코드 1 — 시산표의 2단 헤더 (excel.mjs)**

```javascript
const ws = wb.addWorksheet('합계잔액시산표');
ws.columns = [{ width: 16 }, { width: 16 }, { width: 22 }, { width: 16 }, { width: 16 }];
// ↑ 열 너비는 반드시 "데이터를 넣기 전에" 설정 — 순서를 바꾸면 exceljs가 기존 셀을 덮어쓰는 함정이 있음

// 2단 헤더: [차변(잔액|합계) | 계정과목 | 대변(합계|잔액)] — 실무 표준 열 순서
ws.addRow(['차변', '', '계정과목', '대변', '']);
ws.addRow(['잔액', '합계', '', '합계', '잔액']);
ws.mergeCells('A1:B1');   // "차변"이 잔액·합계 두 열에 걸치게 병합
ws.mergeCells('C1:C2');   // "계정과목"은 세로로 두 행에 걸치게
ws.mergeCells('D1:E1');   // "대변"도 가로 병합

for (const r of tb.rows) {
  ws.addRow([r.debitBalance, r.debitTotal, r.name, r.creditTotal, r.creditBalance]);
  // ↑ 금액은 Number 그대로 넣는다 — 문자열 "142,000,000"을 넣으면 텍스트 셀이 되어 서식·수식이 다 죽음
}
for (const col of ['A', 'B', 'D', 'E']) ws.getColumn(col).numFmt = '#,##0';
// ↑ 콤마 표시는 값이 아니라 "서식"으로 — 값은 계산 가능한 숫자로 남고, 보이는 것만 142,000,000이 됨
```

**핵심 코드 2 — 다운로드 라우트 (server.mjs)**

```javascript
app.get('/api/export.xlsx', async (_req, res, next) => {
  try {
    const entries = await loadEntries();
    const buffer = await buildReportBuffer(entries);
    // ↑ writeBuffer 방식: 파일 생성을 "다 끝낸 뒤에" 응답을 시작 — 도중에 실패하면
    //   HTTP 헤더를 아직 안 보냈으므로 깔끔하게 에러 응답으로 전환할 수 있음 (스트리밍이면 불가능)
    const year = entries.length > 0 ? entries[0].date.slice(0, 4) : String(new Date().getFullYear());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(`결산보고서_${year}.xlsx`)}`);
    // ↑ HTTP 헤더에는 한글을 그대로 못 넣음(인코딩 에러) — filename*=UTF-8'' 문법으로 퍼센트 인코딩해 보내고,
    //   그걸 못 읽는 구형 클라이언트를 위해 ASCII 폴백(report.xlsx)을 나란히 둠
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
```

**핵심 코드 3 — 라운드트립 테스트 (test/excel.test.mjs)**

```javascript
// 라운드트립: 우리가 만든 버퍼를 exceljs로 다시 파싱해 "실제 파일에 적힌 값"을 검증한다.
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(asExcelBuffer(await buildReportBuffer(entries)));
// ↑ 쓰기(writeBuffer)와 읽기(load)를 같은 라이브러리로 왕복 — 렌더 코드가 셀을 한 칸
//   잘못 놓거나 숫자를 문자열로 넣으면, 아래 비교가 계산 결과와 어긋나면서 잡힘

assert.equal(valueByLabel(ws, '자산총계'), bs.totalAssets);
// ↑ "3행 B열" 같은 좌표 대신 라벨로 행을 찾음 — 나중에 행이 한 줄 추가돼도 테스트가 안 깨짐
```

**왜 이렇게 했는지**
- 엑셀 생성 코드는 "에러 없이 실행됨"과 "파일에 올바른 값이 적힘"이 완전히 별개입니다(셀 좌표를 하나 밀려 써도 에러가 안 남). 그래서 완료 기준을 라운드트립으로 잡았습니다 — 구현계획 Step 6의 완료 기준 그대로.
- 타입체크에서 실제로 캐스트 우회가 하나 필요했습니다: exceljs의 타입 선언은 `load()`가 자체 Buffer(ArrayBuffer 계열)만 받는다고 되어 있지만 런타임은 Node Buffer도 지원합니다(테스트 통과가 증거). 이런 "라이브러리 타입 선언이 현실보다 좁은" 경우가 @ts-check 방식에서 캐스트가 정당화되는 대표적인 상황이고, 캐스트 옆에 이유를 주석으로 남겼습니다.
- JSDoc 함정 하나: 파라미터 설명을 `1부터 세는 열 번호`처럼 **숫자로 시작**하게 쓰면 TS 파서가 기본값 문법으로 오해해 구문 오류(TS1351)를 냅니다 — `열 번호 (1부터 셈)`으로 어순만 바꿔 해결.

**새로 나온 용어**
- **라운드트립 테스트(round-trip test)**: 쓴 것을 그대로 다시 읽어 원본과 비교하는 검증. 직렬화(파일 생성) 코드의 "조용한 오류"를 잡는 표준 기법.
- **numFmt(숫자 서식)**: 엑셀 셀의 "보이는 모양"만 정하는 속성. 값 자체는 숫자로 유지되어 계산·합계가 가능함.
- **Content-Disposition / filename***: "이 응답은 화면에 띄우지 말고 파일로 저장하라"는 HTTP 헤더. 한글 파일명은 `filename*=UTF-8''` + 퍼센트 인코딩으로만 안전하게 전달 가능.
- **mergeCells(셀 병합)**: 여러 셀을 하나로 합쳐 값은 왼쪽 위 셀에만 두는 것. 2단 헤더 같은 표 구조를 만들 때 사용.

**확인 질문**
시산표 렌더러에서 금액을 `ws.addRow(['142,000,000', ...])`처럼 콤마 찍힌 문자열로 넣어도 화면(엑셀)에서는 똑같아 보입니다. 그런데도 "값은 Number, 콤마는 numFmt"를 고집한 이유가 뭘까요? 그리고 그런 실수를 저질렀다면 우리 테스트 중 정확히 어느 것이 잡아냈을까요?

---

### Step 22 (2026-07-14) — Step 7: 전표 입력 웹 UI (public/) — "DOM이 곧 상태"

**무엇을 했는지 (한 줄)**
`public/index.html`·`app.js`·`style.css`를 만들어 구현계획 7스텝을 완주했습니다: 전표 입력 폼(계정 select는 `/api/accounts`로 채움) → 차/대 합계·차액 실시간 표시 → **차액 0일 때만 저장 버튼 활성화** → 저장 → 목록 → Excel 다운로드 링크. `app.js`도 `// @ts-check` 대상입니다(jsconfig에 `dom` lib 추가).

**핵심 설계 — 상태 객체를 따로 두지 않는다**

이 규모의 폼 UI에서 최대 버그 원인은 "JS 변수에 든 상태"와 "화면에 보이는 상태"가 어긋나는 것입니다. 그래서 라인 배열 같은 상태 객체를 아예 만들지 않고, 필요할 때마다 DOM에서 직접 읽습니다:

```javascript
/** @returns {HTMLTableRowElement[]} */
const lineRows = () => /** @type {HTMLTableRowElement[]} */ ([...linesBody.querySelectorAll('tr.line')]);
// ↑ "지금 라인이 몇 개인가"의 유일한 진실은 DOM — 변수로 복사해두는 순간 둘이 어긋날 가능성이 생김
```

**핵심 코드 1 — 라인 행 복제와 이벤트 위임**

```javascript
function addLine() {
  const fragment = /** @type {DocumentFragment} */ (lineTemplate.content.cloneNode(true));
  // ↑ <template>은 "화면에 안 보이는 견본 HTML" — cloneNode(true)로 복사해서 진짜 행을 찍어냄
  const select = /** @type {HTMLSelectElement} */ (fragment.querySelector('.account'));
  for (const a of accounts) { /* 계정 옵션 채우기: "103 보통예금" */ }
  linesBody.append(fragment);
}
```

```javascript
form.addEventListener('input', (e) => {
  // ↑ 라인마다 리스너를 다는 게 아니라 form에 딱 1개 — 나중에 추가된 행에도 자동 적용(이벤트 위임)
  const target = e.target;
  if (target instanceof HTMLInputElement) {
    const row = target.closest('tr.line');
    if (row && parseAmount(target.value) > 0) {
      if (target.classList.contains('debit')) inputIn(row, '.credit').value = '0';
      // ↑ 차변에 금액을 넣으면 같은 라인 대변을 0으로 — "한쪽만 양수" 규칙을 서버 검증과 이중 방어
    }
  }
  recalc(); // 어떤 입력이든 → 합계·차액 다시 계산
});
```

**핵심 코드 2 — 차액 0일 때만 저장 가능**

```javascript
const diff = debit - credit;
saveButton.disabled = invalid || diff !== 0 || debit === 0;
// ↑ 대차평균의 원리를 UI에서 강제: 차액이 있으면 저장 버튼 자체가 눌리지 않음.
//   debit === 0 조건은 "전부 0인 전표"(서버도 거부) 차단. 서버 검증이 최종 방어선이고 UI는 1차 방어선
```

콤마 표시는 함정이 있어서 두 이벤트로 나눴습니다: 합계 계산은 `input`(타이핑 즉시), 콤마 포매팅은 `focusout`(입력 칸을 떠날 때) — 타이핑 중에 값을 `142,000`으로 바꿔치기하면 커서가 튀기 때문입니다. 금액 입력은 `type="text" inputmode="numeric"`(모바일에선 숫자 키패드, 콤마 표시 가능, 마우스 휠 오입력 방지).

**핵심 코드 3 — 브라우저 파일이 서버 타입을 재사용**

```javascript
/** @typedef {import('../src/store.mjs').Entry} Entry */
// ↑ 런타임 import가 아니라 "타입만" 가져오는 JSDoc 문법 — 브라우저는 이 파일을 실행할 때
//   src/store.mjs를 전혀 읽지 않지만, 타입 검사기는 서버와 같은 Entry 정의를 공유함.
//   서버 쪽 스키마가 바뀌면 UI 코드의 어긋난 부분이 typecheck에서 바로 드러남
```

**왜 이렇게 했는지**
- 프레임워크/빌드 없이 바닐라 JS로: 이 모듈의 원칙(의존성 2개, 빌드 스텝 0) 그대로. `<script type="module">`이라 전역 오염도 없음.
- "차액 자동 채움" 버튼: 실무 회계 프로그램의 UX — 마지막 라인을 제외한 나머지의 차액을 계산해 마지막 라인의 맞는 쪽에 채워줌. 시연에서 임팩트 있는 디테일.
- 검증: `npm run typecheck` 0 에러(복합 선택자 `querySelectorAll('tr.line')`이 `Element`로 추론되는 것 1건을 캐스트로 해결), 테스트 43개 통과, 서버 기동 후 `/`와 `/app.js` 정적 서빙 200 확인. **브라우저 클릭 검증(수동 체크리스트)은 아직 사람 손으로 안 함** — `npm run seed && npm start` 후 라인 추가/삭제 → 차액 표시 → 저장 → 목록 → 다운로드 순서로 확인 필요.

**새로 나온 용어**
- **`<template>` 요소**: 화면에 렌더링되지 않는 "견본 HTML" 조각. `content.cloneNode(true)`로 복사해 같은 구조의 행을 반복 생성할 때 씀.
- **이벤트 위임(event delegation)**: 자식마다 리스너를 달지 않고 부모 하나에 달아 `e.target`으로 어느 자식인지 판별하는 패턴. 동적으로 추가되는 요소에 자동 적용되는 게 핵심 장점.
- **DOM이 곧 상태**: 별도 상태 변수 없이 화면(DOM)을 유일한 진실로 삼고 매번 읽어오는 설계. 상태 이중화 버그를 원천 차단하지만, 규모가 커지면 프레임워크(React 등)의 상태 관리가 필요해짐.
- **inputmode="numeric"**: `type="number"` 대신 텍스트 입력에 "모바일에서 숫자 키패드를 띄워라"만 지정하는 속성 — 콤마 표시와 공존 가능.

**확인 질문**
전표 라인을 `lines = []` 같은 배열 변수로 관리하지 않고 매번 `querySelectorAll`로 DOM에서 읽어오는 설계를 택했습니다. 만약 배열 변수를 따로 뒀다면, "라인 삭제 버튼"을 구현할 때 정확히 어떤 종류의 버그가 생길 수 있었을까요? (힌트: 같은 정보가 두 군데 있을 때 벌어지는 일)

---

### Step 23 (2026-07-14) — 작업 디렉토리를 projects/ 트랙으로 재편 + 루트 .gitignore 신설 (코드 수정 없음, 저장소 정리)

**무엇을 했는지 (한 줄)**
루트에 평평하게 흩어져 있던 폴더들을 성격별로 `projects/hometax/`(리서치·스파이크·확장·프로토타입)와 `projects/ledger-automation/` 두 트랙으로 묶고, 시크릿·node_modules를 보호하는 루트 `.gitignore`를 새로 만들고, CLAUDE.md의 경로를 새 구조로 갱신했습니다. 제품 코드는 한 줄도 바꾸지 않고 "파일을 옮기기만" 했습니다.

**핵심 코드**

1. 새로 만든 루트 `.gitignore` — 시크릿을 "어느 깊이에서든" 무시하는 게 핵심:

```gitignore
# Secrets — never commit real credentials (examples are OK)
.env
.env.*
!.env.example
# ↑ 선행 슬래시(/)가 없는 패턴이라, 루트의 .env뿐 아니라
#   projects/hometax/fincert-spike/.env 처럼 어느 하위 폴더의 .env도 전부 무시됨.
#   단 .env.example(비밀번호 없는 견본)은 ! 로 예외 처리해 계속 추적함

node_modules/
# ↑ ledger 72MB + (삭제한 react 62MB) 같은 의존성 폴더가 실수로 커밋되는 걸 막음
```

2. git이 "삭제+새 파일"이 아니라 "이름 변경(rename)"으로 인식하게 하는 이동 — 내용이 그대로면 히스토리가 이어집니다:

```bash
mv hometax-guide-extension         projects/hometax/guide-extension
mv tax-agent/hometax-fincert-spike projects/hometax/fincert-spike
mv tax-agent/*.md tax-agent/*.pdf  projects/hometax/research/
# ↑ git mv 대신 일반 mv를 써도, git add 시점에 "내용이 같은 삭제+추가"를
#   rename으로 자동 감지함(추적 파일 한정). 그래서 커밋 히스토리가 끊기지 않음
```

3. 옮기기 전에 "시크릿이 정말 무시되는지" 먼저 검증 (커밋 사고 예방):

```bash
git check-ignore .env
#  .env                                   ← 출력되면 "이 파일은 무시됨"이라는 뜻
git check-ignore projects/hometax/fincert-spike/.env
#  projects/hometax/fincert-spike/.env    ← 하위 폴더의 .env도 무시됨을 확인
```

**왜 이렇게 했는지**
- 루트에 `hometax-*`, `tax-agent`, `ledger-automation`, `my-react-app`, `세무_자동화`, `docs`가 평평하게 널려 있어 "무엇이 한 덩어리 작업인지" 한눈에 안 보였습니다. 홈택스 관련 4개(리서치·스파이크·확장·프로토타입)는 하나의 이니셔티브(에이전트→확장 피벗)라 `projects/hometax/` 한 우산으로, 회계장부는 별개 트랙이라 `projects/ledger-automation/`으로 분리했습니다.
- **재구성보다 `.gitignore`를 먼저** 만든 이유: 루트에 `.gitignore`가 없어서 `git add -A` 한 번이면 node_modules 134MB와 실제 비밀번호가 든 `.env`가 통째로 커밋될 수 있었습니다. 파일을 옮기면 경로가 바뀌므로, 옮기기 전에 "어느 경로의 .env든 무시"를 먼저 보장해두는 게 안전합니다.
- 삭제는 확인된 것만: `my-react-app`(손 안 댄 Vite 기본 스캐폴드)과 `세무_자동화`(notes와 바이트 단위 완전 중복, `diff`로 확인)만 지웠고, 애매한 `scientific.html`·`STRUCTURE OF BRANCH.txt`는 남겨뒀습니다.

**새로 나온 용어**
- **git rename 감지**: git은 파일 "이동"을 따로 저장하지 않고, 커밋 시점에 "사라진 파일과 새로 생긴 파일의 내용이 충분히 같으면" 자동으로 이름 변경으로 간주합니다. 그래서 일반 `mv`로 옮겨도 히스토리(누가 언제 이 줄을 고쳤는지)가 끊기지 않습니다.
- **.gitignore 패턴의 선행 슬래시**: 패턴 앞에 `/`가 없으면 "모든 하위 폴더에서" 매칭되고, `/`로 시작하면 "그 위치에서만" 매칭됩니다. `.env`는 슬래시가 없어 저장소 어디에 있는 .env든 전부 무시됩니다.
- **git check-ignore**: 특정 경로가 `.gitignore` 규칙에 걸려 무시되는지 실제로 물어보는 명령. 무시되면 그 경로를, 아니면 아무것도 출력하지 않습니다 — 커밋 전에 비밀 파일 보호를 검증하는 용도입니다.

**확인 질문**
파일을 `git mv`가 아니라 그냥 `mv`로 옮겼는데도 git 히스토리가 끊기지 않는 이유가 뭔지 설명해주실 수 있나요? (힌트: git이 "이동"을 언제, 무엇을 근거로 판단하는지 — 위 "git rename 감지" 참고)

#### 답변 : 

---

## 용어집

- **storageState (스토리지 스테이트)**: 로그인 상태(쿠키 등)를 파일 하나로 저장해둔 것. 이 파일만 있으면 재로그인 없이 "로그인된 상태"를 재현할 수 있음. (Step 1)
- **Playwright (플레이라이트)**: 브라우저 클릭/입력을 코드로 자동화하는 도구. (Step 1)
- **WebSquare (웹스퀘어)**: 정부 사이트에서 흔히 쓰는 화면 제작 틀. 요소 id가 페이지마다 바뀌어서 "글자로 찾기"가 더 안정적임. (Step 1)
- **elementFromPoint (엘리먼트 프롬 포인트)**: 특정 좌표에서 실제로 맨 위에 보이는 요소가 뭔지 브라우저에게 물어보는 기능. 화면 뒤에 숨은 요소와 헷갈리는 걸 막는 데 씀. (Step 1)
- **앱 비밀번호(App Password)**: 로그인 비밀번호 대신 자동화 도구 전용으로 발급받는 별도 비밀번호. 2단계 인증 필요. (Step 5)
- **SMTP**: 이메일을 실제로 발송할 때 쓰는 표준 통신 방식. (Step 5)
- **npm audit**: 설치된 패키지의 알려진 보안 취약점을 검사하는 npm 명령어. (Step 5)
- **세션 충돌**: 같은 로그인 흔적(storageState)을 두 브라우저 창이 동시에 쓰면 서버가 한쪽을 강제 로그아웃시킬 수 있는 현상. (Step 1)
- **role (역할)**: 화면 요소가 "나는 버튼이다/링크다"라고 스스로 밝히는 정보. 라벨 텍스트와 진짜 버튼을 헷갈리지 않고 정확히 찾는 데 씀. (Step 3)
- **.mjs (엠제이에스)**: 자바스크립트 파일 확장자 중 하나. `import`/`export` 같은 최신 문법(ES Module 방식)으로 짜인 파일이라는 걸 파일 이름 자체에 표시해둔 것 — Node.js가 별도 설정 없이 바로 그 방식으로 읽게 해줌. 반대로 옛날 방식(`require`)을 쓰는 파일은 `.cjs`라고 부름.
- **dialog(대화상자) 이벤트**: 브라우저의 alert/confirm/prompt 팝업을 Playwright가 감지하는 신호. (Step 6)
- **page.waitForEvent('download')**: 클릭 후 실제 파일 다운로드가 시작되길 기다렸다가 저장하는 Playwright 기능. (Step 6)
- **크롬 확장 프로그램 / Manifest V3**: 브라우저에 설치해 특정 사이트 화면에 개입하는 작은 프로그램. `manifest.json`이 최신 규격(V3)으로 "어디에 뭘 넣을지" 정의함. (Step 7)
- **콘텐츠 스크립트(content script)**: 확장 프로그램이 실제 웹페이지 DOM을 직접 읽고 조작하도록 주입하는 자바스크립트. (Step 7)
- **Shadow DOM(섀도우 돔)**: 페이지 안에 스타일이 격리된 미니 영역을 만들어, 확장 프로그램의 CSS가 원래 페이지와 충돌하지 않게 하는 기능. (Step 7)
- **count_tokens API**: 텍스트를 생성하지 않고 토큰 수만 세어주는 Anthropic 공식 엔드포인트. 과금 걱정 없이 비용 계산에 쓸 수 있음. (Step 12)
- **import 부작용(side effect)**: ES 모듈을 import만 해도 그 파일의 최상위 코드가 전부 실행되는 것. 함수 하나만 가져다 쓰려 했는데 원치 않는 동작(서버 실행 등)까지 같이 일어날 수 있음 — `import.meta.url` 가드로 방지. (Step 12)
- **JSONL(JSON Lines)**: JSON 객체를 한 줄에 하나씩 이어 쓰는 파일 형식. 전체를 다시 파싱하지 않고도 끝에 계속 덧붙일 수 있음. (Step 14)
- **fire-and-forget**: 결과를 기다리지 않고 실행만 시켜두는 방식. 실패해도 메인 흐름은 멈추지 않음. (Step 14)
- **백그라운드 서비스 워커**: 콘텐츠 스크립트와 외부 서버 사이를 중계하며 대기하는 확장 프로그램 내부 스크립트. (Step 7)
- **프록시 서버**: API 키를 대신 보관하고 요청만 중계해주는 작은 중간 서버. (Step 7)
- **MutationObserver(뮤테이션 옵저버)**: 화면(DOM) 안에서 변화가 생기면 알려주는 브라우저 기능. (Step 7)
- **프롬프트(prompt)**: AI에게 보내는 질문/지시 텍스트. (Step 9)
- **JSON 파싱 폴백**: AI 응답이 완벽한 JSON이 아닐 경우를 대비해 여러 단계로 안전하게 처리하는 방식. (Step 9)
- **temperature(온도)**: AI 응답의 무작위성을 조절하는 옵션. 낮을수록 일관된 답, 높을수록 다양한 답. 최신 모델 중 일부는 기본값 아닌 값을 주면 요청 자체를 거부함. (Step 10)
- **디자인 토큰(Design Token)**: 색상·크기 같은 디자인 값에 이름을 붙여 CSS 변수로 모아둔 것. 값만 바꾸면 전체 화면 톤이 한 번에 바뀜. (Step 8)
- **커스텀 모달 vs 네이티브 dialog**: 커스텀 모달은 CSS/JS로 직접 그린 가짜 팝업, 네이티브 dialog는 브라우저가 띄우는 진짜 alert/confirm. 후자만 Playwright의 `page.on('dialog')`로 감지됨. (Step 8)
- **max_tokens (맥스 토큰)**: AI 답변의 최대 길이 상한선. 상한에 닿으면 문장 중간이라도 뚝 끊김. (Step 15)
- **stop_reason (스톱 리즌)**: AI가 "왜 말을 멈췄는지" 알려주는 값. `end_turn`=정상 종료, `max_tokens`=길이 상한에 걸려 잘림. (Step 15)
- **메시지 패싱(message passing)**: 크롬 확장 프로그램의 격리된 부품들끼리 `sendMessage`로 "편지"를 주고받는 유일한 대화 방법. (Step 16)
- **직렬화(serialize)**: 그 자리에서만 존재하는 것(DOM 요소 등)을 네트워크로 보낼 수 있는 글자/숫자 목록으로 바꾸는 일. (Step 16)
- **DOM(문서 객체 모델)**: 브라우저가 HTML 원문을 읽어 메모리에 지어놓은 살아있는 화면 구조물. JS가 계속 고칠 수 있어 최종 상태는 HTML 원문과 다를 수 있음. (Step 17)
- **querySelectorAll**: "이 조건에 맞는 요소 전부 달라"고 DOM에 질의하는 브라우저 표준 기능. (Step 17)
- **격리된 세계(isolated world)**: 콘텐츠 스크립트가 페이지와 DOM은 공유하되 JS 변수·함수는 서로 못 보게 크롬이 쳐주는 칸막이. (Step 17)
- **2-그램(2-gram)**: 글자를 2개씩 겹치게 자른 조각. 문구가 정확히 일치하지 않아도 관련성을 대략 잡아내는 가장 단순한 방법. (Step 19)
- **@ts-check / JSDoc 타입 주석**: JS 파일 첫 줄에 `// @ts-check`를 붙이고 주석에 `@param`/`@type` 타입을 적으면, 코드는 JS 그대로 두고 TypeScript 검사기의 타입 검사만 얻는 방식. (Step 20)
- **unknown 타입**: "정체 불명이니 런타임 검사를 거치기 전에는 속성 접근 금지"인 타입. 외부 입력에 붙여 검증 누락을 컴파일 단계에서 차단. (Step 20)
- **tsc --noEmit**: TypeScript 컴파일러를 파일 생성 없이 "검사만" 모드로 실행하는 것 (`npm run typecheck`). (Step 20)
- **listen(0)**: 서버를 0번 포트로 열어 OS가 빈 포트를 골라주게 하는 기법 — 테스트 포트 충돌 방지. (Step 20)
- **라운드트립 테스트(round-trip test)**: 쓴 것을 그대로 다시 읽어 원본과 비교하는 검증 — 파일 생성 코드의 "조용한 오류"를 잡음. (Step 21)
- **numFmt(숫자 서식)**: 엑셀 셀의 보이는 모양만 정하는 속성. 값은 숫자로 유지돼 계산 가능. (Step 21)
- **Content-Disposition**: "파일로 저장하라"는 HTTP 응답 헤더. 한글 파일명은 `filename*=UTF-8''` 인코딩으로 전달. (Step 21)
- **`<template>` 요소**: 렌더링되지 않는 견본 HTML 조각 — `cloneNode(true)`로 복사해 반복 구조를 찍어냄. (Step 22)
- **이벤트 위임(event delegation)**: 부모 요소 하나에 리스너를 달고 `e.target`으로 자식을 판별 — 동적 요소에 자동 적용. (Step 22)
- **DOM이 곧 상태**: 별도 상태 변수 없이 DOM을 유일한 진실로 삼는 소규모 UI 설계 패턴. (Step 22)
- **git rename 감지**: git은 파일 이동을 따로 기록하지 않고, 커밋 시 "사라진 파일과 새 파일의 내용이 충분히 같으면" 이름 변경으로 자동 간주함. 일반 `mv`로 옮겨도 히스토리가 이어짐. (Step 23)
- **.gitignore 선행 슬래시**: 패턴 앞에 `/`가 없으면 모든 하위 폴더에서, `/`로 시작하면 그 위치에서만 매칭됨. `.env`는 슬래시가 없어 어느 폴더의 .env든 전부 무시. (Step 23)
- **git check-ignore**: 특정 경로가 `.gitignore`에 걸려 무시되는지 물어보는 명령 — 무시되면 그 경로를 출력, 아니면 침묵. 커밋 전 비밀 파일 보호 검증용. (Step 23)
