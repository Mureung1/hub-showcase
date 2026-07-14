// hometax-guide-extension/content-script.js의 serializeInteractiveElements 로직을
// 실제 홈택스의 "환급금 조회 이외의" 여러 화면에서 재현 테스트하기 위한 진단 스크립트.
// 기존 storageState.json을 재사용한다 — 동시에 다른 브라우저 세션이 같은 storageState를
// 쓰고 있으면 세션 충돌로 강제 로그아웃될 수 있으니 단일 인스턴스로만 실행할 것.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, 'auth', 'storageState.json');

// content-script.js와 동일한 로직 (진단용으로 그대로 복사)
const SERIALIZE_FN_SOURCE = `
(function () {
  const CLICKABLE_SELECTOR = 'button, a, [role="button"], [role="tab"], span, div, td, li, label';
  const POPUP_SELECTOR = '.w2popup_window';

  function getSearchRoot() {
    const popups = Array.from(document.querySelectorAll(POPUP_SELECTOR)).filter((popup) => {
      const rect = popup.getBoundingClientRect();
      const style = getComputedStyle(popup);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    return popups.length > 0 ? popups[popups.length - 1] : document;
  }

  function isLeafLike(el) {
    if (el.children.length === 0) return true;
    const ownText = (el.textContent || '').trim();
    return !Array.from(el.children).some((child) => (child.textContent || '').trim() === ownText);
  }

  function serialize() {
    const root = getSearchRoot();
    const candidates = root.querySelectorAll(CLICKABLE_SELECTOR);
    const seen = new Set();
    const list = [];
    let belowFoldCount = 0;
    let aboveOrLeftCount = 0;

    for (const el of candidates) {
      const text = (el.textContent || '').trim().replace(/\\s+/g, ' ');
      if (!text || text.length > 60) continue;
      if (!isLeafLike(el)) continue;

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      if (!visible) continue;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (cy > window.innerHeight) { belowFoldCount++; continue; }
      if (cy < 0) { aboveOrLeftCount++; continue; }
      if (cx < 0 || cx > window.innerWidth) { aboveOrLeftCount++; continue; }

      const topEl = document.elementFromPoint(cx, cy);
      if (!(topEl && (el.contains(topEl) || topEl.contains(el)))) continue;

      const key = text + '|' + Math.round(rect.top) + '|' + Math.round(rect.left);
      if (seen.has(key)) continue;
      seen.add(key);

      list.push({ text, role: el.getAttribute('role') || el.tagName.toLowerCase() });
      if (list.length >= 120) break;
    }

    return {
      rootIsPopup: root !== document,
      matchedCount: list.length,
      belowFoldCount,
      aboveOrLeftCount,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      sample: list.slice(0, 15),
    };
  }

  return serialize();
})()
`;

async function describeFrames(page) {
  return page.frames().map((f) => ({ name: f.name(), url: f.url() }));
}

// content-script.js의 occlusion-safe 매칭과 동일한 로직으로 "실제 클릭 가능한" 요소를 찾아서
// 네이티브 DOM click을 실행한다 (Playwright의 getByText().click()은 DOM 순서상 첫 매치를
// 그대로 집어서, 화면 뒤에 숨은 동일 텍스트 중복 요소에 걸려 멈추는 문제가 있었음 — 실측 확인).
async function clickByText(page, text, { exact = false } = {}) {
  return page.evaluate(
    ({ text, exact }) => {
      const CLICKABLE_SELECTOR = 'button, a, [role="button"], [role="tab"], span, div, td, li, label';
      const candidates = document.querySelectorAll(CLICKABLE_SELECTOR);
      for (const el of candidates) {
        const content = (el.textContent || '').trim();
        const matches = exact ? content === text : content.includes(text);
        if (!matches) continue;
        if (!exact && el.children.length > 0) {
          const childSame = Array.from(el.children).some((c) => (c.textContent || '').trim() === content);
          if (childSame) continue;
        }
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        if (!visible) continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
        const topEl = document.elementFromPoint(cx, cy);
        if (topEl && (el.contains(topEl) || topEl.contains(el))) {
          el.click();
          return true;
        }
      }
      return false;
    },
    { text, exact }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('[1] 홈택스 접속...');
  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const loggedIn = await page
    .getByText(/로그아웃|나의 홈택스/, { exact: false })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  console.log('로그인 상태:', loggedIn ? 'OK' : '실패 (로그인 안 됨 — 진행 중단)');
  if (!loggedIn) {
    await browser.close();
    return;
  }

  console.log('\n[프레임 구조 - 홈 화면]', JSON.stringify(await describeFrames(page), null, 2));

  console.log('\n[2] 전체메뉴 열기...');
  const opened = await clickByText(page, '전체메뉴', { exact: true });
  console.log('  전체메뉴 클릭:', opened ? '성공' : '실패');
  await page.waitForTimeout(2500);

  // 카테고리 이름을 하드코딩하지 않고, 실제 팝업 안에 "지금 어떤 탭들이 있는지"를 그대로 읽어온다.
  const discoveredCategories = await page.evaluate(`
    (function () {
      const popup = document.querySelector('.w2popup_window');
      if (!popup) return [];
      const tabItems = popup.querySelectorAll('.w2tabcontrol_li');
      const names = [];
      tabItems.forEach((li) => {
        const text = (li.textContent || '').trim();
        if (text && !names.includes(text)) names.push(text);
      });
      return names;
    })()
  `);
  console.log('  실제 발견된 카테고리 탭 목록:', JSON.stringify(discoveredCategories));

  // 스크롤 가능한 컨테이너를 클래스명 하드코딩 없이 실측으로 찾는 헬퍼
  async function scanScrollables(page) {
    return page.evaluate(`
      (function () {
        const all = document.querySelectorAll('*');
        const found = [];
        for (const el of all) {
          if (el.scrollHeight > el.clientHeight + 5 && el.clientHeight > 20) {
            const rect = el.getBoundingClientRect();
            found.push({
              tag: el.tagName, cls: (el.className || '').toString().slice(0, 60),
              scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop,
              visibleNow: rect.width > 0 && rect.height > 0,
            });
          }
        }
        return found.slice(0, 20);
      })()
    `);
  }

  async function scanFrames(page) {
    const frames = await describeFrames(page);
    return frames.filter((f) => f.url && f.url !== 'about:blank');
  }

  const categoriesToTest = discoveredCategories.length > 0 ? discoveredCategories : ['(발견된 카테고리 없음)'];

  for (const category of categoriesToTest) {
    console.log(`\n=== 카테고리: "${category}" ===`);
    const clicked = await clickByText(page, category, { exact: true });
    if (!clicked) {
      console.log('  탭 클릭 실패 (occlusion-safe 매칭으로도 못 찾음)');
      continue;
    }
    await page.waitForTimeout(1200);

    const result = await page.evaluate(SERIALIZE_FN_SOURCE);
    console.log('  요소 탐색 결과:', JSON.stringify(result));

    const scrollables = await scanScrollables(page);
    console.log('  스크롤 가능한 컨테이너:', scrollables.length > 0 ? JSON.stringify(scrollables) : '없음');

    const realFrames = await scanFrames(page);
    console.log('  실제 콘텐츠 있는 iframe:', realFrames.length > 0 ? JSON.stringify(realFrames) : '없음');
  }

  console.log('\n[3] 전체메뉴 팝업 내부 스크롤 테스트 (마지막 카테고리 기준)...');
  const popupScrollTest = await page.evaluate(`
    (function () {
      const popup = document.querySelector('.w2popup_window');
      if (!popup) return { hasPopup: false };
      const scrollable = popup.querySelector('[class*="scroll"]') || popup;
      const before = scrollable.scrollTop;
      scrollable.scrollTop = scrollable.scrollHeight;
      const after = scrollable.scrollTop;
      return { hasPopup: true, scrollableTag: scrollable.tagName, scrollableClass: scrollable.className, before, after, scrollHeight: scrollable.scrollHeight, clientHeight: scrollable.clientHeight };
    })()
  `);
  console.log('  팝업 스크롤 정보:', JSON.stringify(popupScrollTest, null, 2));

  await page.waitForTimeout(1000);
  const afterScrollResult = await page.evaluate(SERIALIZE_FN_SOURCE);
  console.log('  스크롤 후 재탐색 결과:', JSON.stringify(afterScrollResult, null, 2));

  console.log('\n완료. 브라우저를 닫습니다.');
  await browser.close();
}

main().catch((err) => {
  console.error('테스트 실패:', err);
  process.exit(1);
});
