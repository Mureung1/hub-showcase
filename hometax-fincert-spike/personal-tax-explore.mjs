// 4단계 스파이크 — 개인 계정으로 실제 접근 가능한 세금 업무 메뉴 지도 그리기 + 유력 후보 3개 폼 구조 탐색
// 사업자용 금융인증서를 아직 확보하지 못해 전자세금계산서 발급 경로는 막혀 있음(invoice-account-check.mjs에서 확인).
// 이 스크립트는 "개인 금융인증서만으로 뭘 자동화할 수 있는가"를 실측으로 넓게 훑는다.
// Step A: 전체메뉴 사이트맵을 그대로 덤프(개인 계정에 실제로 "보이는" 것만)
// Step B: 후보 3개(국세증명 발급, 환급금 조회, 현금영수증 조회)를 순서대로 클릭해 폼 구조만 관찰
// 제출/발급 버튼은 절대 누르지 않음. storageState만 재사용하고 자격증명은 전혀 다루지 않음.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const OUT_DIR = path.resolve('reports/personal');

// Step A 실측(2026-07-09)으로 확인된 전체메뉴 좌측 대분류 탭 + 그 안의 실제 링크 텍스트를 반영.
// "소득금액증명" 등은 대분류 탭을 먼저 열지 않으면 화면 뒤(다른 즐겨찾기 영역)의 가려진 동일 텍스트와
// 혼동될 수 있어(실측: 클릭이 엉뚱한 팝업 윈도우에 가로막힘), 후보마다 먼저 열어야 할 대분류 탭을 명시한다.
const CANDIDATES = [
  {
    key: 'tax-certificate',
    label: '국세증명 발급',
    category: '증명･등록･신청･사업장현황',
    texts: ['소득금액증명', '사실증명원', '납세증명서', '국세증명'],
  },
  {
    key: 'refund',
    label: '환급금 조회',
    category: '납부·고지·환급',
    texts: ['환급금 조회', '국세환급금', '환급금'],
  },
  {
    key: 'cash-receipt',
    label: '현금영수증 조회(근로자·소비자)',
    category: '계산서·영수증·카드',
    texts: ['근로자·소비자 조회/변경', '현금영수증'],
  },
];

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

// 단순 CSS visible 체크만으로는 부족함 — 실측 중 "소득금액증명" 같은 텍스트가 화면 뒤에 깔린
// 다른 즐겨찾기/팝업 윈도우 요소와 겹쳐, 클릭이 그 위 레이어에 가로막히는 현상이 확인됨.
// 그래서 각 후보 요소의 중심 좌표에서 document.elementFromPoint로 "실제로 맨 위에 있는 요소"인지도 함께 확인한다.
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

async function dumpSiteMap(page) {
  const links = await page.locator('a, span[role="button"], button').evaluateAll((els) =>
    els.slice(0, 1000).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      return {
        tag: el.tagName,
        text: (el.textContent || '').trim(),
        visible,
      };
    })
  );
  return links.filter((l) => l.visible && l.text.length > 0);
}

async function returnToMenu(page) {
  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const menuBtn = await findVisibleByText(page, '전체메뉴');
  if (menuBtn) {
    await menuBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null, storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  console.log('=== 개인 계정 세금 업무 메뉴 지도 그리기 스파이크 ===\n');

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
    console.log('로그인 유지가 확인되지 않음 — storageState가 만료됐을 수 있습니다.');
    console.log('`npm run login-test`로 재로그인 후 다시 실행해주세요.');
    await page.screenshot({ path: path.join(OUT_DIR, '00-not-logged-in.png'), fullPage: true });
    await browser.close();
    return;
  }
  console.log('로그인 유지 확인됨. 전체메뉴 탐색을 시작합니다.\n');

  // === Step A: 전체메뉴 지도 그리기 ===
  const allMenuBtn = await findVisibleByText(page, '전체메뉴');
  if (allMenuBtn) {
    await allMenuBtn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  } else {
    console.log('"전체메뉴" 버튼을 못 찾음 — 랜딩 화면 그대로 지도를 그립니다.');
  }
  await page.screenshot({ path: path.join(OUT_DIR, '01-all-menu.png'), fullPage: true });

  const siteMap = await dumpSiteMap(page);
  await writeFile(path.join(OUT_DIR, 'all-menu-dump.json'), JSON.stringify(siteMap, null, 2), 'utf-8');
  console.log(`전체메뉴 지도 저장됨: ${siteMap.length}개 항목 → reports/personal/all-menu-dump.json\n`);

  // === Step B: 유력 후보 3개 딥다이브 (제출/발급 버튼은 누르지 않음) ===
  const results = [];
  for (const candidate of CANDIDATES) {
    console.log(`--- 후보: ${candidate.label} ---`);

    if (candidate.category) {
      const categoryTab = await findVisibleByText(page, candidate.category);
      if (categoryTab) {
        await categoryTab.click({ timeout: 8000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1500);
      } else {
        console.log(`  대분류 탭 "${candidate.category}"를 못 찾음 — 현재 열린 탭 기준으로 계속 탐색`);
      }
    }

    const match = await findFirstVisible(page, candidate.texts);
    if (!match) {
      console.log(`  "${candidate.texts.join(', ')}" 중 어느 것도 화면에서 못 찾음 — 스킵`);
      const debugPath = path.join(OUT_DIR, `debug-${candidate.key}-not-found.png`);
      await page.screenshot({ path: debugPath, fullPage: true });
      const panelDump = await dumpSiteMap(page);
      await writeFile(
        path.join(OUT_DIR, `debug-${candidate.key}-panel-dump.json`),
        JSON.stringify(panelDump, null, 2),
        'utf-8'
      );
      console.log(`  진단용 스크린샷/덤프 저장: ${debugPath}\n`);
      results.push({ ...candidate, found: false });
      continue;
    }
    try {
      await match.locator.click({ timeout: 8000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const screenshotPath = path.join(OUT_DIR, `02-${candidate.key}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const dumps = [await dumpFormFields(page.mainFrame(), 'main')];
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        dumps.push(await dumpFormFields(frame, `iframe:${frame.name() || frame.url()}`));
      }
      await writeFile(path.join(OUT_DIR, `${candidate.key}-dumps.json`), JSON.stringify(dumps, null, 2), 'utf-8');
      console.log(`  "${match.matchedText}" 클릭 성공 → ${screenshotPath}\n`);
      results.push({ ...candidate, found: true, matchedText: match.matchedText });

      await returnToMenu(page);
    } catch (err) {
      console.log(`  클릭/탐색 실패: ${err}\n`);
      results.push({ ...candidate, found: false, error: String(err) });
      await returnToMenu(page);
    }
  }

  await writeFile(path.join(OUT_DIR, 'candidates-summary.json'), JSON.stringify(results, null, 2), 'utf-8');

  console.log('=== 요약 ===');
  for (const r of results) {
    console.log(`  ${r.label}: ${r.found ? `찾음 (${r.matchedText})` : '못 찾음'}`);
  }
  console.log(`\n결과 저장 위치: ${OUT_DIR}`);
  console.log('브라우저는 열어둔 채로 둡니다 — 직접 화면을 눌러보며 확인해보세요. 종료하려면 터미널에서 Ctrl+C.');
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('개인 세금 업무 탐색 스크립트 실패:', err);
  process.exit(1);
});
