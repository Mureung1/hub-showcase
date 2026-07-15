export function getMockAnswer(question: string, context: string): string {
  return `(mock 답변) "${question}"에 대한 답변이에요. 지금 화면 상태: ${context}`
}
