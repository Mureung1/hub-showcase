// 3단계 스파이크 — Step 3: 전자(세금)계산서 발급 — 폼 입력 → 미리보기 → 게이트된 실제 제출
//
// ⚠️ 이 파일은 Step 2(invoice-explore.mjs) 실행 결과를 보기 전에 미리 작성해둔 템플릿입니다.
//    `FILL_INVOICE_FORM` 함수 안 TODO 부분은 실제 발급 화면의 selector를 확인한 뒤 채워야 실행 가능합니다.
//    (reports/invoice/invoice-explore-dumps.json + 05-invoice-form.png 참고)
//
// 안전장치 (이미 완성됨, 그대로 유지):
//   - 인증서 비밀번호/PIN은 다루지 않음 — storageState 재사용만 함.
//   - 최종 "발급" 버튼은 터미널에 정확한 문자열(발급확인)을 입력해야만 클릭됨.
//   - 실제 거래처/금액은 이 파일 상단 INVOICE_DATA에 사용자가 직접 채워넣음 — 가짜 데이터 아님.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
import path from 'node:path';

const AUTH_DIR = path.resolve('auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'storageState.json');
const OUT_DIR = path.resolve('reports/invoice');

// ─────────────────────────────────────────────────────────────
// 사용자가 직접 채우는 실제 거래 정보 (법적으로 문제없는 거래처/금액만 사용)
// ─────────────────────────────────────────────────────────────
const INVOICE_DATA = {
  counterpartyBusinessNo: '', // 거래처 사업자등록번호 (예: '1234567890')
  itemName: '', // 품목명
  quantity: '', // 수량
  unitPrice: '', // 단가
  supplyAmount: '', // 공급가액 (비워두면 수량*단가로 자동계산되는 화면일 수도 있음 — Step 2 확인 후 결정)
  taxAmount: '', // 세액
  writeDate: '', // 작성일자 (YYYY-MM-DD)
  recipientEmail: '', // 수신 이메일 (선택)
};

async function pause(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
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

async function navigateToInvoiceForm(page) {
  await page.goto('https://www.hometax.go.kr', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Control+-');
  await page.keyboard.press('Control+-');

  const loginIndicator = page.getByText(/로그아웃|마이홈택스|나의 홈택스/, { exact: false }).first();
  await loginIndicator.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  let target = await findVisibleByText(page, '전자(세금)계산서 건별발급');
  if (!target) {
    const allMenuBtn = await findVisibleByText(page, '전체메뉴');
    if (allMenuBtn) {
      await allMenuBtn.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1500);
      target = await findVisibleByText(page, '전자(세금)계산서 건별발급');
    }
  }
  if (!target) {
    throw new Error('"전자(세금)계산서 건별발급" 메뉴를 찾지 못함 — invoice-explore.mjs로 먼저 경로를 재확인하세요.');
  }

  await target.click({ timeout: 8000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// ⚠️ TODO: Step 2(invoice-explore.mjs) 결과의 invoice-explore-dumps.json / 05-invoice-form.png를
// 보고 아래 selector를 실제 값으로 채우세요. 지금은 자리표시자(placeholder)입니다.
async function fillInvoiceForm(page, data) {
  // 예시 형태 (실제 selector로 교체 필요):
  // await page.getByRole('textbox', { name: '거래처 사업자등록번호' }).fill(data.counterpartyBusinessNo);
  // await page.getByRole('button', { name: '조회' }).click();
  // await page.getByRole('textbox', { name: '품목' }).fill(data.itemName);
  // ...
  throw new Error(
    'fillInvoiceForm이 아직 구현되지 않음 — invoice-explore.mjs 결과를 보고 실제 selector로 채워주세요.'
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  if (!INVOICE_DATA.counterpartyBusinessNo) {
    console.log('INVOICE_DATA가 비어있습니다. 이 파일 상단에서 실제(법적으로 안전한) 거래 정보를 채운 뒤 다시 실행하세요.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null, storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  console.log('=== Step 3: 세금계산서 발급 — 폼 입력 → 미리보기 → 게이트된 실제 제출 ===\n');

  await navigateToInvoiceForm(page);
  await page.screenshot({ path: path.join(OUT_DIR, '06-form-loaded.png'), fullPage: true });

  await fillInvoiceForm(page, INVOICE_DATA);
  await page.screenshot({ path: path.join(OUT_DIR, '07-form-filled.png'), fullPage: true });

  // ⚠️ TODO: "미리보기" 버튼 selector 확정 필요
  // await page.getByRole('button', { name: '미리보기' }).click();
  // await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '08-preview.png'), fullPage: true });

  console.log('\n미리보기 화면(08-preview.png)을 직접 확인해주세요 — 거래처/품목/금액이 의도한 대로 맞는지.');
  console.log('실제로 제출되면 되돌릴 수 없는 법적 문서입니다.\n');

  const confirmation = await pause('제출을 진행하려면 정확히 "발급확인" 을 입력하세요 (다른 입력 시 중단): ');

  if (confirmation.trim() !== '발급확인') {
    console.log('확인 문자열이 일치하지 않아 중단합니다. 실제 제출은 실행되지 않았습니다.');
    await browser.close();
    return;
  }

  // ⚠️ TODO: 실제 "발급" 제출 버튼 selector 확정 필요
  // await page.getByRole('button', { name: '발급' }).click();
  // await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(OUT_DIR, '09-after-submit.png'), fullPage: true });

  const resultLog = {
    submittedAt: new Date().toISOString(),
    invoiceData: INVOICE_DATA,
  };
  await writeFile(path.join(OUT_DIR, 'invoice-submit-log.json'), JSON.stringify(resultLog, null, 2), 'utf-8');

  console.log('\n제출 완료(또는 TODO 미구현으로 실제 클릭은 스킵됨) — 09-after-submit.png와 invoice-submit-log.json 확인.');
  console.log('브라우저는 열어둔 채로 둡니다 — 접수번호 등을 직접 확인하세요. 종료하려면 Ctrl+C.');
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('발급 스크립트 실패:', err);
  process.exit(1);
});
