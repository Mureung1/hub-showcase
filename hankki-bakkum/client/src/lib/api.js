// Express 서버 호출 전용 (AI 문구 생성 등) — LLM 키는 절대 클라이언트에 두지 않는다
const API = import.meta.env.VITE_API_URL;

export async function generateAdCopy(situation) {
  const res = await fetch(`${API}/api/ai/ad-copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ situation }),
  });
  if (!res.ok) throw new Error('AI 문구 생성 실패');
  return res.json();
}

export async function confirmRequest(requestId, userId) {
  const res = await fetch(`${API}/api/requests/${requestId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '완료 확인에 실패했어요.');
  return data;
}

// 식사권 1장 사용 차감 — 사장님이 눈앞에서 PIN 6자리를 입력해야 차감된다
export async function redeemTicket(ticketId, pin) {
  const res = await fetch(`${API}/api/tickets/${ticketId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '식사권 사용에 실패했어요.');
  return data;
}

// 사장님 PIN 설정 — 해싱·검증은 전부 server가 한다 (평문은 여기서 넘기고 끝)
export async function setPin(userId, pin) {
  const res = await fetch(`${API}/api/pin/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'PIN 설정에 실패했어요.');
  return data;
}

// PIN을 설정했는지 여부만 확인 (해시값은 server가 내보내지 않음)
export async function getPinStatus(userId) {
  const res = await fetch(`${API}/api/pin/status?userId=${userId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'PIN 상태를 확인하지 못했어요.');
  return data; // { isOwner, hasPin }
}