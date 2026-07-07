import { useState } from 'react'
import AppRouter from './router.jsx'
import { geminiComplete } from './lib/gemini.js'

function App() {
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

  // TODO: 프록시 확인용 임시 테스트 버튼 - 확인 후 제거
  async function handleGeminiTest() {
    setTesting(true)
    setTestResult('')
    try {
      const text = await geminiComplete({ prompt: '안녕하세요! 한 문장으로 자기소개 해주세요.' })
      setTestResult(text)
    } catch (err) {
      setTestResult(`Error: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <AppRouter />
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, maxWidth: 320 }}>
        <button onClick={handleGeminiTest} disabled={testing}>
          {testing ? 'Gemini 호출 중...' : 'Gemini 프록시 테스트'}
        </button>
        {testResult && (
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: 8, marginTop: 8 }}>
            {testResult}
          </pre>
        )}
      </div>
    </>
  )
}

export default App
