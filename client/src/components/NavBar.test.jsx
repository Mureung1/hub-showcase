import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavBar from './NavBar';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
    </MemoryRouter>
  );
}

describe('NavBar', () => {
  test('4개 탭 라벨이 모두 렌더링된다', () => {
    renderAt('/');

    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('수강 바구니')).toBeInTheDocument();
    expect(screen.getByText('시뮬레이션')).toBeInTheDocument();
    expect(screen.getByText('챗봇')).toBeInTheDocument();
  });

  test('현재 경로와 일치하는 링크에만 active 클래스가 붙는다', () => {
    renderAt('/basket');

    expect(screen.getByText('수강 바구니')).toHaveClass('active');
    expect(screen.getByText('홈')).not.toHaveClass('active');
    expect(screen.getByText('시뮬레이션')).not.toHaveClass('active');
    expect(screen.getByText('챗봇')).not.toHaveClass('active');
  });

  test('각 탭은 해당 라우트로 이동하는 링크다', () => {
    renderAt('/');

    expect(screen.getByText('홈').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('수강 바구니').closest('a')).toHaveAttribute('href', '/basket');
    expect(screen.getByText('시뮬레이션').closest('a')).toHaveAttribute('href', '/simulation');
    expect(screen.getByText('챗봇').closest('a')).toHaveAttribute('href', '/chat');
  });

  test('active 탭에는 aria-current="page"가 설정된다', () => {
    renderAt('/basket');

    expect(screen.getByText('수강 바구니')).toHaveAttribute('aria-current', 'page');
  });
});
