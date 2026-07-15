const PHONE_RE = /01[0-9]-?\d{3,4}-?\d{4}/g;
const EMAIL_RE = /[\w.-]+@[\w.-]+\.\w+/g;
const BLOCK_KEYWORDS = ["영업비밀", "기업 기밀", "미공개 계획"];

function maskPhone(match) {
  const digits = match.replace(/-/g, "");
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function maskEmail(match) {
  const [local, domain] = match.split("@");
  return `${local[0]}***@${domain}`;
}

function detect(text) {
  const detections = [];
  let masked = text;

  masked = masked.replace(PHONE_RE, (m) => {
    detections.push({ type: "전화번호", value: m, method: "정규식" });
    return maskPhone(m);
  });

  masked = masked.replace(EMAIL_RE, (m) => {
    detections.push({ type: "이메일", value: m, method: "정규식" });
    return maskEmail(m);
  });

  const blockedKeyword = BLOCK_KEYWORDS.find((k) => text.includes(k));

  return { detections, masked, blockedKeyword };
}

// 목업 구현. 백엔드(/v1/chat)가 준비되면 client.post("/chat", { prompt })로 교체한다.
export async function sendChatMessage(prompt) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const { detections, masked, blockedKeyword } = detect(prompt);

  if (blockedKeyword) {
    return {
      status: "blocked",
      detections,
      blockReason: `"${blockedKeyword}" 포함 — 기업 기밀 유출 의심으로 요청이 차단되었습니다.`,
    };
  }

  if (detections.length > 0) {
    return {
      status: "masked",
      detections,
      maskedPrompt: masked,
      response: `(마스킹된 입력 기준 응답) "${masked}"에 대한 요약입니다.`,
    };
  }

  return {
    status: "pass",
    detections: [],
    response: `"${prompt}"에 대한 응답입니다.`,
  };
}
