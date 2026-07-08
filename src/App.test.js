import { render, screen } from '@testing-library/react';
import App from './App';

test('renders project introduction', () => {
  render(<App />);
  expect(screen.getByText(/재고 소진 예측/i)).toBeInTheDocument();
  expect(screen.getByText(/콜롬비아 원두 250g/i)).toBeInTheDocument();
});
