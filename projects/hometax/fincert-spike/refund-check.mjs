// 5단계 스파이크 — "환급금 조회"를 실제로 자동 실행해보는 첫 자동화 테스트.
// personal-tax-explore.mjs(4단계)에서 "환급금 상세조회" 화면이 완전한 읽기 전용 조회 폼임을 확인했다.
// 이 스크립트는 로그인 확인 → 메뉴 진입 → "조회" 버튼 클릭 → 결과 테이블 읽기까지 전 과정을 자동으로 수행한다.
// 여전히 아무것도 "제출"하지 않는다 — 조회(읽기)만 자동화. storageState만 재사용하고 자격증명은 다루지 않는다.
// 결과 테이블에 계좌번호 등 민감정보가 나올 수 있어, 콘솔에는 건수만 출력하고 전체 내용은 gitignore된
// reports/personal/에만 저장한다.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const OUT_DIR = path.resolve('reports/personal');
const DOWNLOAD_DIR = path.join(OUT_DIR, 'downloads');

async function pause(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

// personal-tax-explore.mjs와 동일한 헬퍼(겹친 요소에 클릭이 가로막히는 문제를 막기 위한 오클루전 체크 포함).
async function findVisibleByText(page, text) {
  const all = page.getByText(text, { exact: false });
  const count = await all.count();
  if (count === 0) return null;
  const flags = await all.evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const basicVisible =
        rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      if (!basicVisible) return false;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
      const topEl = document.elementFromPoint(cx, cy);
      return !!topEl && (el.contains(topEl) || topEl.contains(el));
    })
  );
  const idx = flags.findIndex((v) => v);
  if (idx === -1) return null;
  return all.nth(idx);
}

async function findFirstVisible(page, texts) {
  for (const text of texts) {
    const found = await findVisibleByText(page, text);
    if (found) return { locator: found, matchedText: text };
  }
  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(DOWNLOAD_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null, storageState: STORAGE_STATE_PATH, acceptDownloads: true });
  const page = await context.newPage();
  page.on('dialog', async (dialog) => {
    console.log(`[대화상자 감지] type=${dialog.type()} message="${dialog.message()}"`);
    await dialog.dismiss().catch(() => {});
  });

  console.log('=== 환급금 조회 자동화 테스트 (조회만 수행, 제출 없음) ===\n');

  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Control+-');
  await page.keyboard.press('Control+-');

  const loginIndicator = page.getByText(/로그아웃|마이홈택스|나의 홈택스/, { exact: false }).first();
  const loggedIn = await loginIndicator
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  if (!loggedIn) {
    console.log('로그인 유지가 확인되지 않음 — `npm run login-test`로 재로그인 후 다시 실행해주세요.');
    await browser.close();
    return;
  }
  console.log('로그인 유지 확인됨.\n');

  // 전체메뉴 → 납부·고지·환급 → 환급금
  const allMenuBtn = await findVisibleByText(page, '전체메뉴');
  if (allMenuBtn) {
    await allMenuBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  const categoryTab = await findVisibleByText(page, '납부·고지·환급');
  if (categoryTab) {
    await categoryTab.click({ timeout: 8000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  const refundLink = await findFirstVisible(page, ['환급금 조회', '환급금']);
  if (!refundLink) {
    console.log('"환급금" 메뉴를 못 찾음 — 화면 구조가 바뀌었을 수 있습니다. 종료합니다.');
    await page.screenshot({ path: path.join(OUT_DIR, 'refund-check-not-found.png'), fullPage: true });
    await browser.close();
    return;
  }
  await refundLink.locator.click({ timeout: 8000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log(`"${refundLink.matchedText}" 진입 완료.\n`);

  // 화면 기본 조회기간은 최근 1개월뿐이라 그보다 오래된 미수령 환급금은 놓칠 수 있음
  // (화면 안내문 기준 조회일로부터 5년 이내까지 조회 가능). 시작일을 직접 타이핑으로 넓힐지 사람에게 확인.
  const yearsInput = await pause(
    '조회기간 시작일을 몇 년 전으로 넓힐까요? (화면 기본값은 최근 1개월 — 엔터=기본값 유지, 숫자 입력 시 최대 5년까지 적용): '
  );
  const years = Math.min(Math.max(parseInt(yearsInput.trim(), 10) || 0, 0), 5);
  if (years > 0) {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    const startDateStr = startDate.toISOString().slice(0, 10);
    // WebSquare 달력 컴포넌트지만 실측 결과 readOnly가 아니라 직접 타이핑으로 값이 반영됨(id는 화면 고유값이라 안정적).
    const startDateInput = page.locator('#mf_txppWframe_calStrtDt_input');
    const startDateVisible = await startDateInput.isVisible().catch(() => false);
    if (startDateVisible) {
      await startDateInput.click({ timeout: 5000 });
      await startDateInput.fill(startDateStr);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      console.log(`조회기간 시작일을 ${startDateStr}로 변경함.`);
    } else {
      console.log('조회기간 시작일 입력란을 찾지 못해 화면 기본값(최근 1개월)으로 진행합니다.');
    }
  }

  console.log('\n조회 버튼을 찾는 중...');

  // "환급금 상세조회" 화면의 "조회" 버튼 — "조회구분" 같은 라벨 텍스트와 헷갈리지 않도록 role=button으로 좁힘.
  const queryButton = page.getByRole('button', { name: '조회', exact: true }).first();
  const queryButtonVisible = await queryButton
    .evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const topEl = document.elementFromPoint(cx, cy);
      return !!topEl && (el.contains(topEl) || topEl.contains(el));
    })
    .catch(() => false);

  if (queryButtonVisible) {
    await queryButton.click({ timeout: 8000 });
  } else {
    console.log('role=button 기준으로 "조회" 버튼을 못 찾음 — 텍스트 기반으로 재시도합니다.');
    const fallback = await findVisibleByText(page, '조회');
    if (!fallback) {
      console.log('조회 버튼을 전혀 못 찾음 — 화면을 스크린샷으로 남기고 종료합니다.');
      await page.screenshot({ path: path.join(OUT_DIR, 'refund-check-no-query-btn.png'), fullPage: true });
      await browser.close();
      return;
    }
    await fallback.click({ timeout: 8000 });
  }

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const screenshotPath = path.join(OUT_DIR, '03-refund-query-result.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // 결과 테이블 읽기 — 계좌번호 등 민감정보가 포함될 수 있으므로 콘솔에는 건수만 출력하고,
  // 전체 내용은 gitignore 처리된 reports/personal/에만 저장한다.
  const tableRows = await page
    .locator('table tbody tr')
    .evaluateAll((rows) => rows.map((row) => Array.from(row.querySelectorAll('td')).map((td) => (td.textContent || '').trim())))
    .catch(() => []);

  const meaningfulRows = tableRows.filter((r) => r.some((cell) => cell.length > 0));

  await writeFile(
    path.join(OUT_DIR, 'refund-check-result.json'),
    JSON.stringify({ checkedAt: new Date().toISOString(), rowCount: meaningfulRows.length, rows: meaningfulRows }, null, 2),
    'utf-8'
  );

  // 테이블 파싱 대신(또는 더불어) 홈택스가 직접 만들어주는 원본 파일을 확보 — "엑셀 내려받기" 버튼.
  // 여전히 조회 결과를 내보내기만 하는 읽기 액션이라 발송/제출류 확인 게이트는 필요 없음.
  // 결과 0건일 땐 홈택스가 "조회된 데이터가 없습니다" 알림창을 띄우며 다운로드를 거부하므로(실측 확인),
  // 데이터가 있을 때만 시도한다.
  if (meaningfulRows.length === 0) {
    console.log('조회 결과가 0건이라 엑셀 다운로드는 생략합니다.');
  } else {
    const excelButton = page.getByRole('button', { name: '엑셀 내려받기' });
    const excelButtonVisible = await excelButton.isVisible().catch(() => false);
    if (excelButtonVisible) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 10000 }),
          excelButton.click({ timeout: 8000 }),
        ]);
        const downloadedPath = path.join(
          DOWNLOAD_DIR,
          `refund-${new Date().toISOString().replace(/[:.]/g, '-')}-${download.suggestedFilename()}`
        );
        await download.saveAs(downloadedPath);
        console.log(`엑셀 파일 다운로드 완료: ${downloadedPath}`);
      } catch (err) {
        console.log('엑셀 다운로드 실패 (건너뜀):', err.message);
      }
    } else {
      console.log('"엑셀 내려받기" 버튼을 찾지 못해 다운로드는 건너뜁니다.');
    }
  }

  console.log(`\n조회 완료 — 결과 ${meaningfulRows.length}건.`);
  console.log(`스크린샷: ${screenshotPath}`);
  console.log('전체 데이터(민감정보 포함 가능): reports/personal/refund-check-result.json (gitignore 처리됨, 콘솔에는 출력 안 함)');
  console.log('\n브라우저는 열어둔 채로 둡니다 — 직접 확인 후 터미널에서 Ctrl+C로 종료하세요.');
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('환급금 조회 자동화 스크립트 실패:', err);
  process.exit(1);
});
