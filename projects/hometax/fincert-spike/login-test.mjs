// 2단계 스파이크 — 금융인증서 "자동연결" 지속성 확인
// 1단계(explore-login.mjs)는 자격증명 없이 화면 구조만 봤다면,
// 이 스크립트는 실제 로그인을 사용자가 직접 수행하고, 그 세션(storageState)을
// 새 브라우저 컨텍스트에서 재사용했을 때 재인증 없이 로그인 상태가 유지되는지 확인한다.
//
// 에이전트는 자격증명을 입력하지 않는다 — 로그인/은행 앱 승인은 항상 사용자가 직접 수행.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import readline from 'node:readline/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');

async function pause(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(question);
  rl.close();
}

async function main() {
  await mkdir(AUTH_DIR, { recursive: true });

  console.log('\n=== 1단계: 직접 로그인 ===');
  console.log('브라우저가 뜨면 아래를 직접 진행하세요 (에이전트는 개입하지 않음):');
  console.log('  1. 로그인 → 공동·금융인증서 → 금융인증서 탭');
  console.log('  2. 사업자용 금융인증서로 로그인 (은행 앱 승인 등 필요한 인증 직접 수행)');
  console.log('  3. "자동연결" / "이 기기에서 계속 로그인 유지" 옵션이 보이면 체크');
  console.log('  4. 로그인 완료 후 마이페이지 등 "로그인됨"이 보이는 화면까지 이동\n');

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Control+-');
  await page.keyboard.press('Control+-');

  console.log('화면이 여전히 잘리면 브라우저에서 Ctrl+- 를 더 눌러 줌아웃하거나 Ctrl+0으로 리셋해보세요.');
  await pause('로그인 완료 후 여기서 Enter를 누르세요 (이 창은 그대로 두세요)... ');

  await page.screenshot({ path: path.join(AUTH_DIR, 'after-manual-login.png'), fullPage: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log(`\nstorageState 저장됨: ${STORAGE_STATE_PATH}`);

  await browser.close();

  console.log('\n=== 2단계: 새 브라우저에서 재로그인 없이 유지되는지 확인 ===');
  const browser2 = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context2 = await browser2.newContext({
    viewport: null,
    storageState: STORAGE_STATE_PATH,
  });
  const page2 = await context2.newPage();
  await page2.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page2.keyboard.press('Control+-');
  await page2.keyboard.press('Control+-');
  await page2.waitForTimeout(3000);
  await page2.screenshot({ path: path.join(AUTH_DIR, 'reopened-with-storage-state.png'), fullPage: true });

  console.log('\n새로 열린 창을 직접 확인해주세요:');
  console.log('  - 로그인 상태가 그대로 유지되는가?');
  console.log('  - 아니면 PIN(간편비밀번호)만 다시 물어보는가?');
  console.log('  - 아니면 처음부터 인증서 선택을 다시 요구하는가?');
  console.log(`  - 스크린샷도 저장됨: ${path.join(AUTH_DIR, 'reopened-with-storage-state.png')}`);

  await pause('\n확인 후 Enter를 누르면 브라우저를 닫습니다... ');
  await browser2.close();
}

main().catch((err) => {
  console.error('로그인 테스트 스크립트 실패:', err);
  process.exit(1);
});
