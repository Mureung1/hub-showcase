// 홈택스 AI 가이드 확장 프로그램을 실제로 로드한 크롬 브라우저를 띄우는 개발용 스크립트 (임시, 검증용).
// 기존 storageState.json은 재사용하지 않는다 — 완전히 새 프로필로 시작해서 사용자가 직접 로그인해도
// 다른 세션(예: 이 폴더의 storageState.json)과 충돌하지 않는다.
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, '..', 'hometax-guide-extension');
const USER_DATA_DIR = path.join(__dirname, '.tmp-chrome-profile-ext-test');

async function main() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const page = context.pages()[0] || (await context.newPage());
  page.on('console', (msg) => console.log(`[PAGE CONSOLE ${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log('[PAGE ERROR]', err.message));

  await page.goto('https://www.hometax.go.kr');
  console.log('브라우저가 열렸습니다. 직접 로그인해주세요.');
  console.log('확장 프로그램이 로드되었는지 chrome://extensions 에서 확인 가능합니다.');
  console.log('이 프로세스는 계속 떠 있습니다.');

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('실행 실패:', err);
  process.exit(1);
});
