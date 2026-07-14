// 3단계 스파이크 — Step 1: 계정 종류 / 전자세금계산서 발급 메뉴 접근 가능 여부 확인 (체크포인트)
// 저장된 storageState(로그인 유지)를 재사용해 로그인 화면을 건너뛰고,
// "전자세금계산서" 발급 메뉴가 실제로 보이는지/눌리는지를 관찰한다.
// 리서치 기준 "발급은 사업자등록번호로 발급된 인증서만 가능" — 지금 storageState가
// 개인 계정이면 여기서 막힐 가능성이 높다. 이 스크립트는 그걸 실측으로 확인하는 용도.
//
// 에이전트는 자격증명을 전혀 다루지 않는다 — storageState 재사용만 함.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const OUT_DIR = path.resolve('reports/invoice');

async function dumpFrameInputs(frame, label) {
  const items = await frame.locator('a, button, span').evaluateAll((els) =>
    els.slice(0, 300).map((el) => ({
      tag: el.tagName,
      id: el.id || null,
      text: (el.textContent || '').trim().slice(0, 40),
      class: el.className || null,
    }))
  );
  return { label, url: frame.url(), items };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({
    viewport: null,
    storageState: STORAGE_STATE_PATH,
  });
  const page = await context.newPage();

  console.log('=== Step 1: 로그인 유지 + 발급 메뉴 접근 확인 ===\n');

  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Control+-');
  await page.keyboard.press('Control+-');

  // 홈택스는 WebSquare 기반이라 domcontentloaded 이후에도 한참 로딩 중일 수 있음.
  // 로그인 후에만 보이는 텍스트가 나타날 때까지 최대 20초 대기 (실패해도 계속 진행 — 스크린샷으로 판단).
  const loginIndicator = page.getByText(/로그아웃|마이홈택스|나의 홈택스/, { exact: false }).first();
  const appeared = await loginIndicator
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  // 네트워크가 조용해질 때까지 추가로 기다려 완전히 그려진 상태를 확보 (실패해도 무시)
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(OUT_DIR, '01-landing.png'), fullPage: true });

  console.log(`로그인 유지 여부(추정): ${appeared ? '유지됨 (로그아웃/마이홈택스 텍스트 실제로 보임)' : '불확실 — 20초 내 로그인 표시를 못 찾음. 스크린샷으로 직접 확인 필요'}`);

  // "전자세금계산서" 텍스트 중 실제로 화면에 "보이는" 것만 필터링 (숨겨진 접근성용 텍스트 제외)
  const invoiceMenuAll = page.getByText('전자세금계산서', { exact: false });
  const allCount = await invoiceMenuAll.count();
  const visibleFlags = await invoiceMenuAll.evaluateAll((els) =>
    els.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
  );
  const visibleIndexes = visibleFlags.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  console.log(`"전자세금계산서" 텍스트 후보: 전체 ${allCount}개, 그중 실제로 보이는 것 ${visibleIndexes.length}개`);

  const dumps = [];
  dumps.push(await dumpFrameInputs(page.mainFrame(), 'main'));
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      dumps.push(await dumpFrameInputs(frame, `iframe:${frame.name() || frame.url()}`));
    } catch (err) {
      dumps.push({ label: `iframe:${frame.url()}`, error: String(err) });
    }
  }

  if (visibleIndexes.length > 0) {
    try {
      await invoiceMenuAll.nth(visibleIndexes[0]).click({ timeout: 8000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(OUT_DIR, '02-after-invoice-menu-click.png'), fullPage: true });
      dumps.push(await dumpFrameInputs(page.mainFrame(), 'main-after-click'));
      console.log('"전자세금계산서" 메뉴 클릭 완료 — 02-after-invoice-menu-click.png 확인');
    } catch (err) {
      console.log(`메뉴 클릭 실패(계정 제한 가능성 있음): ${err}`);
    }
  } else {
    console.log('화면에 실제로 "보이는" "전자세금계산서" 메뉴를 찾지 못함 — 개인 계정이라 메뉴 자체가 숨겨져 있거나, 다른 진입 경로(상단 대메뉴 먼저 열어야 함)일 가능성 있음. 01-landing.png를 직접 확인해주세요.');
  }

  await writeFile(path.join(OUT_DIR, 'account-check-dumps.json'), JSON.stringify(dumps, null, 2), 'utf-8');

  console.log(`\n결과 저장 위치: ${OUT_DIR}`);
  console.log('스크린샷과 함께 직접 확인해주세요:');
  console.log('  1. 로그인이 유지되고 있는가?');
  console.log('  2. "전자세금계산서" 메뉴가 보이는가, 눌렸는가?');
  console.log('  3. 계정 종류(개인/사업자)를 화면 어디선가 확인할 수 있는가?');

  console.log('\n브라우저는 열어둔 채로 둡니다 — 직접 화면을 탐색해보고 종료하려면 터미널에서 Ctrl+C를 누르세요.');
  await new Promise(() => {}); // 사용자가 직접 종료할 때까지 대기
}

main().catch((err) => {
  console.error('계정 확인 스크립트 실패:', err);
  process.exit(1);
});
