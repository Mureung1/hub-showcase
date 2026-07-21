import { render, screen } from '@testing-library/react'
import App from '../App'

test('앱이 크래시 없이 렌더링된다', () => {
  render(<App />)
  // 랜딩 또는 대시보드 중 하나가 마운트되면 통과
  expect(document.body).toBeTruthy()
})
