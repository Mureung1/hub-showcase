export async function analyzeWithAi() {
  const error = new Error('Real AI analysis is not implemented.')
  error.statusCode = 501
  error.type = 'ai_not_implemented'
  error.publicMessage =
    'Real AI analysis is not implemented in this phase. Use mode "mock" for the Express skeleton.'
  throw error
}
