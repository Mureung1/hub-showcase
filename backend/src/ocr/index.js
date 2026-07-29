import { recognizeReceiptText as clova } from './clovaOcr.js';
import { recognizeReceiptText as textract } from './textractOcr.js';

// 두 공급자 모두 같은 계약을 지킨다: 크레덴셜이 없으면 null(→ 다음 후보로), 있는데 실패하면 throw.
// 그래서 여기선 "null이면 다음 것 시도"만 하면 되고, 실패는 그대로 위로 올라가 재촬영 안내로 이어진다.
// Textract를 먼저 두는 이유: Clova는 NCP 콘솔 가입 절차가 번거로워 실제로 발급을 못 한 상태라
// (docs/backlog.md 참고) 지금 실사용 공급자는 Textract 쪽이다. 둘 다 없으면 null → store.js가 Mock 폴백.
const PROVIDERS = [textract, clova];

export async function recognizeReceiptText(imageBuffer, mimeType) {
  for (const provider of PROVIDERS) {
    const lines = await provider(imageBuffer, mimeType);
    if (lines) return lines;
  }
  return null;
}
