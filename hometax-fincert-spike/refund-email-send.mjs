// 6단계 스파이크 — 환급금 조회 결과를 실제로 이메일 발송하는 파이프라인 테스트.
// Gmail MCP(create_draft)는 초안 생성까지만 지원해서, 실제 "발송"을 확인하려고
// Nodemailer + Gmail 앱 비밀번호로 SMTP 직접 발송하는 방식을 택했다(LangChain/OpenClaw는
// 이 규모엔 오버스펙이라 기각 — tax-agent-research.md §1-9 참고).
//
// refund-check.mjs가 만들어둔 reports/personal/refund-check-result.json을 읽어 메일을 구성한다.
// invoice-issue.mjs와 동일한 원칙: 되돌릴 수 없는/타인에게 보이는 액션(이메일 발송)은
// 사람이 정확한 확인 문자열을 입력해야만 실행된다. 앱 비밀번호는 .env에만 두고 로그에 남기지 않는다.

import 'dotenv/config';
import nodemailer from 'nodemailer';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
import path from 'node:path';

const RESULT_PATH = path.resolve('reports/personal/refund-check-result.json');

async function pause(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

function formatEmail(result) {
  const { checkedAt, rowCount, rows } = result;
  const checkedAtKST = new Date(checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const subject = `[홈택스 자동조회] 환급금 조회 결과 — ${rowCount}건 (${checkedAtKST})`;

  const lines = [];
  lines.push('개인 금융인증서 기반 홈택스 자동화 스파이크 테스트 메일입니다.');
  lines.push('');
  lines.push(`조회 시각: ${checkedAtKST}`);
  lines.push(`결과 건수: ${rowCount}건`);
  lines.push('');

  if (rowCount === 0) {
    lines.push('조회된 환급금 내역이 없습니다.');
  } else {
    lines.push('환급금 내역:');
    rows.forEach((row, i) => {
      lines.push(`  ${i + 1}. ${row.join(' | ')}`);
    });
  }

  lines.push('');
  lines.push('(refund-check.mjs → refund-email-send.mjs 자동 파이프라인으로 생성된 테스트 메일)');

  return { subject, body: lines.join('\n') };
}

async function main() {
  const sender = process.env.GMAIL_SENDER_ADDRESS;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  const recipient = process.env.REFUND_EMAIL_RECIPIENT;

  if (!sender || !appPassword || !recipient) {
    console.log('.env에 GMAIL_SENDER_ADDRESS / GMAIL_APP_PASSWORD / REFUND_EMAIL_RECIPIENT가 모두 설정돼 있어야 합니다.');
    console.log('hometax-fincert-spike/.env.example을 참고해 값을 채운 뒤 다시 실행해주세요.');
    process.exit(1);
  }

  let result;
  try {
    const raw = await readFile(RESULT_PATH, 'utf-8');
    result = JSON.parse(raw);
  } catch (err) {
    console.log(`${RESULT_PATH}를 읽을 수 없습니다 — 먼저 \`npm run refund-check\`를 실행해주세요.`);
    console.log(String(err));
    process.exit(1);
  }

  const { subject, body } = formatEmail(result);

  console.log('=== 발송 미리보기 ===');
  console.log(`From: ${sender}`);
  console.log(`To:   ${recipient}`);
  console.log(`Subject: ${subject}`);
  console.log('---');
  console.log(body);
  console.log('---\n');

  const confirmation = await pause('실제로 발송하려면 정확히 "발송확인" 을 입력하세요 (다른 입력 시 중단): ');
  if (confirmation.trim() !== '발송확인') {
    console.log('확인 문자열이 일치하지 않아 중단합니다. 이메일은 발송되지 않았습니다.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: sender, pass: appPassword },
  });

  try {
    const info = await transporter.sendMail({
      from: sender,
      to: recipient,
      subject,
      text: body,
    });
    console.log(`\n발송 성공. messageId: ${info.messageId}`);
  } catch (err) {
    console.error('\n발송 실패:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('환급금 이메일 발송 스크립트 실패:', err);
  process.exit(1);
});
