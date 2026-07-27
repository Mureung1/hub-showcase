import { randomUUID } from 'crypto';
import { env } from '../env.js';

const OCR_TIMEOUT_MS = 15_000; // docs/api.md: "외부 OCR 응답 지연·실패에 대비해 타임아웃을 반드시 처리"

// Naver Clova OCR(General) 호출. Invoke URL/Secret Key가 없으면(로컬 개발 등) null을 반환해서
// 호출부가 기존 데모 Mock 로직으로 폴백하도록 한다 — 크레덴셜 없이도 앱이 죽지 않아야 한다.
export async function recognizeReceiptText(imageBuffer, mimeType) {
  const invokeUrl = env.CLOVA_OCR_INVOKE_URL;
  const secretKey = env.CLOVA_OCR_SECRET_KEY;
  if (!invokeUrl || !secretKey) return null;

  const format = mimeType?.includes('png') ? 'png' : 'jpg';
  const body = {
    version: 'V2',
    requestId: randomUUID(),
    timestamp: Date.now(),
    images: [{ format, name: 'receipt', data: imageBuffer.toString('base64') }],
  };

  let res;
  try {
    res = await fetch(`${invokeUrl}/general`, {
      method: 'POST',
      headers: { 'X-OCR-SECRET': secretKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
    });
  } catch (networkErr) {
    if (networkErr.name === 'TimeoutError') {
      throw new Error('영수증 인식이 너무 오래 걸려요. 다시 촬영해 주세요.');
    }
    // networkErr.message는 invokeUrl(내부 엔드포인트) 등 인프라 정보를 담고 있을 수 있어
    // 그대로 클라이언트 응답(err.message → JSON)에 실어 보내지 않는다 — 서버 로그에만 남긴다.
    console.error('Clova OCR 네트워크 오류:', networkErr);
    throw new Error('영수증 인식 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
  }

  if (!res.ok) {
    // 응답 본문에 시크릿 자체는 안 담기지만, Naver 측 내부 오류 메시지를 사용자에게 그대로
    // 노출하지 않기 위해 서버 로그에만 남기고 클라이언트에는 정형화된 메시지만 던진다.
    const text = await res.text().catch(() => '');
    console.error(`Clova OCR 요청 실패 (${res.status}):`, text.slice(0, 500));
    throw new Error('영수증 인식에 실패했어요. 다시 촬영해 주세요.');
  }

  const data = await res.json();
  const fields = data.images?.[0]?.fields ?? [];
  return fieldsToLines(fields);
}

// Clova General OCR은 단어 단위 field를 반환하고 lineBreak:true인 field가 줄의 끝을 표시한다.
// 이걸 무시하고 단어 하나하나를 매칭하면 "돼지고기 앞다리"처럼 이름에 공백이 들어간 재료를
// 놓치므로, lineBreak 기준으로 다시 줄 단위 문자열로 합친다. 스키마가 다르면(필드에 lineBreak가
// 아예 없으면) 안전하게 단어 하나 = 한 줄로 취급한다.
function fieldsToLines(fields) {
  const hasLineBreakInfo = fields.some((f) => typeof f.lineBreak === 'boolean');
  if (!hasLineBreakInfo) return fields.map((f) => f.inferText).filter(Boolean);

  const lines = [];
  let current = [];
  for (const f of fields) {
    if (!f.inferText) continue;
    current.push(f.inferText);
    if (f.lineBreak) {
      lines.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) lines.push(current.join(' '));
  return lines;
}
