import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { env } from '../env.js';

const OCR_TIMEOUT_MS = 15_000; // docs/api.md: "외부 OCR 응답 지연·실패에 대비해 타임아웃을 반드시 처리"

// SDK 클라이언트는 커넥션 풀을 들고 있어 요청마다 새로 만들면 낭비 — 크레덴셜이 있을 때 한 번만 만든다.
let client = null;
function getClient() {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) return null;
  client ??= new TextractClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

// Amazon Textract(DetectDocumentText) 호출. clovaOcr.js와 같은 계약을 지킨다 —
// 크레덴셜이 없으면 null을 반환해 호출부가 다음 공급자/Mock으로 폴백하게 하고,
// 크레덴셜이 있는데 실패하면 에러를 던져 사용자에게 재촬영을 유도한다.
//
// mimeType을 안 쓰는 이유: Clova는 format을 본문에 명시해야 하지만 Textract는 바이트를 보고
// JPEG/PNG를 스스로 판별한다. 계약(시그니처)을 맞추려고 인자는 그대로 받는다.
export async function recognizeReceiptText(imageBuffer, _mimeType) {
  const textract = getClient();
  if (!textract) return null;

  let res;
  try {
    res = await textract.send(
      new DetectDocumentTextCommand({ Document: { Bytes: imageBuffer } }),
      { abortSignal: AbortSignal.timeout(OCR_TIMEOUT_MS) },
    );
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('영수증 인식이 너무 오래 걸려요. 다시 촬영해 주세요.');
    }
    // AWS 에러 메시지엔 계정 ID·ARN 같은 인프라 정보가 섞일 수 있어 그대로 클라이언트에
    // 내보내지 않는다(clovaOcr.js와 동일한 이유) — 서버 로그에만 남긴다.
    console.error('Textract OCR 오류:', err);
    throw new Error('영수증 인식에 실패했어요. 다시 촬영해 주세요.');
  }

  // Textract는 WORD/LINE/PAGE 블록을 함께 주는데, LINE이 이미 "한 줄" 단위라
  // Clova처럼 단어를 다시 합칠 필요가 없다(fieldsToLines 같은 재조립 로직 불필요).
  return (res.Blocks ?? [])
    .filter((b) => b.BlockType === 'LINE' && b.Text)
    .map((b) => b.Text);
}
