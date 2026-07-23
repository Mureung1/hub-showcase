import { render, screen } from '@testing-library/react'

describe('Dummy component test', () => {
  it('should render successfully', () => {
    render(<div>Hello Vitest</div>)
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument()
  })
})
