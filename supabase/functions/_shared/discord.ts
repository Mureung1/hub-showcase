// Discord 인터랙션 서명 검증 + 응답 헬퍼.
// 근거: docs/research.md §9 (Ed25519 서명 검증, 인터랙션 타입, 3초 응답 제한, Bot API)

/** Discord 인터랙션 요청의 Ed25519 서명을 검증한다.
 * 반환된 body(raw 텍스트)를 이후 JSON.parse해서 사용해야 한다(스트림은 한 번만 읽을 수 있음). */
export async function verifyDiscordRequest(
  req: Request,
  publicKey: string,
): Promise<{ valid: boolean; body: string }> {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  if (!signature || !timestamp || !publicKey) {
    return { valid: false, body };
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    );

    return { valid, body };
  } catch (error) {
    console.error("[discord] 서명 검증 중 오류:", error);
    return { valid: false, body };
  }
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim();
  const bytes = new Uint8Array(new ArrayBuffer(clean.length / 2));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** type 1 PING → PONG 응답. */
export function pong(): Response {
  return jsonResponse({ type: 1 });
}

/** type 5 DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, ephemeral(flags 1<<6). 3초 제한을 피하려고 즉시 응답한 뒤
 * editOriginalResponse로 후속 처리한다. */
export function deferEphemeral(): Response {
  return jsonResponse({ type: 5, data: { flags: 1 << 6 } });
}

/** type 4 CHANNEL_MESSAGE_WITH_SOURCE. 즉시 메시지로 응답할 때 사용. */
export function messageResponse(data: unknown): Response {
  return jsonResponse({ type: 4, data });
}

/** type 7 UPDATE_MESSAGE. 버튼/셀렉트 클릭에 대해 기존 메시지를 즉시 갱신할 때 사용
 * (components: []로 컴포넌트 제거 가능). */
export function updateMessage(data: unknown): Response {
  return jsonResponse({ type: 7, data });
}

/** 인터랙션 최초 응답(defer)을 최종 메시지로 교체한다.
 * PATCH https://discord.com/api/v10/webhooks/{application_id}/{token}/messages/@original */
export async function editOriginalResponse(
  applicationId: string,
  token: string,
  payload: unknown,
): Promise<void> {
  const url =
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord editOriginalResponse 실패 (${res.status}): ${text}`);
  }
}

/**
 * Bot 토큰으로 채널에 직접 메시지를 보낸다(버튼 컴포넌트 첨부 가능).
 * monitor(감시) Edge Function과의 계약 시그니처이므로 그대로 유지해야 한다.
 */
export async function sendChannelMessage(
  channelId: string,
  payload: unknown,
): Promise<void> {
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN 환경변수가 필요합니다.");
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord sendChannelMessage 실패 (${res.status}): ${text}`);
  }
}
