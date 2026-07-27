const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export async function askAI(question: string, context: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'AI 질문 기능을 잠시 이용할 수 없습니다.')
  }

  return data.answer as string
}
