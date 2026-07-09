// 5단계 스파이크 — "환급금 조회"를 실제로 자동 실행해보는 첫 자동화 테스트.
// personal-tax-explore.mjs(4단계)에서 "환급금 상세조회" 화면이 완전한 읽기 전용 조회 폼임을 확인했다.
// 이 스크립트는 로그인 확인 → 메뉴 진입 → "조회" 버튼 클릭 → 결과 테이블 읽기까지 전 과정을 자동으로 수행한다.
// 여전히 아무것도 "제출"하지 않는다 — 조회(읽기)만 자동화. storageState만 재사용하고 자격증명은 다루지 않는다.
// 결과 테이블에 계좌번호 등 민감정보가 나올 수 있어, 콘솔에는 건수만 출력하고 전체 내용은 gitignore된
// reports/personal/에만 저장한다.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const OUT_DIR = path.resolve('reports/personal');

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

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null, storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

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

  console.log(`"${refundLink.matchedText}" 진입 완료. 조회 버튼을 찾는 중...`);

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
