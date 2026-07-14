// 3단계 스파이크 — Step 2: 전자(세금)계산서 건별발급 화면 구조 탐색 (제출 없음)
// 사업자용 storageState(login-test.mjs를 사업자 인증서로 재실행한 결과)가 필요함.
// 목적: 발급 폼의 실제 필드(거래처 조회, 품목, 금액 등)를 추측이 아니라 관찰로 파악해서,
// Step 3(invoice-issue.mjs)가 정확한 selector를 쓰도록 함. 실제 값 입력/제출 없음.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const OUT_DIR = path.resolve('reports/invoice');

async function dumpFormFields(frame, label) {
  try {
    const fields = await frame.locator('input, select, textarea, button, a').evaluateAll((els) =>
      els.slice(0, 400).map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible =
          rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        return {
          tag: el.tagName,
          type: el.getAttribute('type'),
          id: el.id || null,
          name: el.getAttribute('name'),
          placeholder: el.getAttribute('placeholder'),
          text: (el.textContent || '').trim().slice(0, 40),
          visible,
        };
      })
    );
    return { label, url: frame.url(), fields };
  } catch (err) {
    return { label, error: String(err) };
  }
}

async function findVisibleByText(page, text) {
  const all = page.getByText(text, { exact: false });
  const count = await all.count();
  if (count === 0) return null;
  const flags = await all.evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
  );
  const idx = flags.findIndex((v) => v);
  if (idx === -1) return null;
  return all.nth(idx);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null, storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  console.log('=== Step 2: 전자(세금)계산서 건별발급 화면 구조 탐색 ===\n');
  console.log('※ 사업자용 storageState가 저장돼 있어야 함 (login-test.mjs를 사업자 인증서로 재실행 후).\n');

  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Control+-');
  await page.keyboard.press('Control+-');

  const loginIndicator = page.getByText(/로그아웃|마이홈택스|나의 홈택스/, { exact: false }).first();
  await loginIndicator.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '03-before-menu.png'), fullPage: true });

  // Step 1(invoice-account-check.mjs)에서 확인된 경로:
  // 전체메뉴 → "전자(세금)계산서 발급" 섹션 → "전자(세금)계산서 건별발급"
  let target = await findVisibleByText(page, '전자(세금)계산서 건별발급');

  if (!target) {
    // 링크가 바로 안 보이면 "전체메뉴" 버튼을 먼저 열어야 할 수 있음
    const allMenuBtn = await findVisibleByText(page, '전체메뉴');
    if (allMenuBtn) {
      await allMenuBtn.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, '04-all-menu-open.png'), fullPage: true });
      target = await findVisibleByText(page, '전자(세금)계산서 건별발급');
    }
  }

  if (!target) {
    console.log('"전자(세금)계산서 건별발급" 링크를 화면에서 못 찾음 — 03/04 스크린샷을 직접 확인해주세요.');
    console.log('(사업자 계정으로 안 바뀌었거나, 메뉴 경로가 이번엔 다를 수 있습니다.)');
    await writeFile(
      path.join(OUT_DIR, 'invoice-explore-dumps.json'),
      JSON.stringify([{ note: '건별발급 링크 못 찾음 — 스크린샷 직접 확인 필요' }], null, 2),
      'utf-8'
    );
    console.log('\n브라우저는 열어둔 채로 둡니다. 종료하려면 Ctrl+C.');
    await new Promise(() => {});
    return;
  }

  await target.click({ timeout: 8000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '05-invoice-form.png'), fullPage: true });
  console.log('"전자(세금)계산서 건별발급" 클릭 완료 — 05-invoice-form.png 확인');

  const dumps = [];
  dumps.push(await dumpFormFields(page.mainFrame(), 'main'));
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    dumps.push(await dumpFormFields(frame, `iframe:${frame.name() || frame.url()}`));
  }

  await writeFile(path.join(OUT_DIR, 'invoice-explore-dumps.json'), JSON.stringify(dumps, null, 2), 'utf-8');

  console.log(`\n결과 저장 위치: ${OUT_DIR}`);
  console.log('05-invoice-form.png와 invoice-explore-dumps.json을 같이 확인해서, invoice-issue.mjs에 채워넣을 필드를 파악합니다:');
  console.log('  - 거래처(사업자번호) 조회/입력 필드');
  console.log('  - 작성일자');
  console.log('  - 품목/규격/수량/단가');
  console.log('  - 공급가액/세액');
  console.log('  - 이메일(수신처)');
  console.log('  - "미리보기"/"발급" 버튼 위치');

  console.log('\n브라우저는 열어둔 채로 둡니다 — 직접 화면을 눌러보며 폼 구조를 확인해보세요. 종료하려면 터미널에서 Ctrl+C.');
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('발급 화면 탐색 스크립트 실패:', err);
  process.exit(1);
});
