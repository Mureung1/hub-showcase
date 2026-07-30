export async function analyzeListing(request) {
  const response = await fetch('/api/analyze-listing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || '분석 API 요청에 실패했습니다.')
  }

  return data.analysis
}
