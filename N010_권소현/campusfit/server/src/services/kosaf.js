const BASE_URL =
  "https://api.odcloud.kr/api/15028252/v1/uddi:16645324-7d91-4a1e-a603-a0f2e0029cbb";

export async function fetchKosafScholarships({ page = 1, perPage = 100 } = {}) {
  const url = `${BASE_URL}?page=${page}&perPage=${perPage}&serviceKey=${process.env.KOSAF_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`한국장학재단 API 요청 실패: ${res.status}`);
  return res.json();
}
