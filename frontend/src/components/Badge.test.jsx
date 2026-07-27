import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Badge from './Badge.jsx';

test('children 텍스트를 렌더링한다', () => {
  render(<Badge color="green">D-3</Badge>);
  expect(screen.getByText('D-3')).toBeInTheDocument();
});

test('color prop이 className에 반영된다', () => {
  render(<Badge color="red">임박</Badge>);
  expect(screen.getByText('임박')).toHaveClass('badge', 'red');
});

test('color를 안 주면 기본값 gray를 쓴다', () => {
  render(<Badge>기본</Badge>);
  expect(screen.getByText('기본')).toHaveClass('gray');
});
