export async function requestPortfolio({ repositoryUrl, jdText }) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryUrl, jdText }),
  });

  const body = await res.json();

  if (!body.success) {
    throw new Error(body.error?.message || '포트폴리오 생성에 실패했습니다.');
  }

  return body.data;
}
