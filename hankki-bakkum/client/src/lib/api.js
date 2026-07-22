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

// 식사권 1장 사용 차감 — 대면 확인 방식 (사장님이 눈앞에서 확인)
export async function redeemTicket(ticketId) {
  const res = await fetch(`${API}/api/tickets/${ticketId}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '식사권 사용에 실패했어요.');
  return data;
}