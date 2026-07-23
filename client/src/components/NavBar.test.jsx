import { render, screen, fireEvent } from '@testing-library/react';
import NavBar from './NavBar';

describe('NavBar', () => {
  test('4개 탭 라벨이 모두 렌더링된다', () => {
    render(<NavBar activeTab="home" onNavigate={() => {}} />);

    expect(screen.getByText('홈')).toBeInTheDocument();
    expect(screen.getByText('수강 바구니')).toBeInTheDocument();
    expect(screen.getByText('시뮬레이션')).toBeInTheDocument();
    expect(screen.getByText('챗봇')).toBeInTheDocument();
  });

  test('activeTab과 일치하는 탭에만 active 클래스가 붙는다', () => {
    render(<NavBar activeTab="basket" onNavigate={() => {}} />);

    expect(screen.getByText('수강 바구니')).toHaveClass('active');
    expect(screen.getByText('홈')).not.toHaveClass('active');
    expect(screen.getByText('시뮬레이션')).not.toHaveClass('active');
    expect(screen.getByText('챗봇')).not.toHaveClass('active');
  });

  test('탭을 클릭하면 onNavigate가 해당 key와 함께 호출된다', () => {
    const onNavigate = vi.fn();
    render(<NavBar activeTab="home" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('챗봇'));

    expect(onNavigate).toHaveBeenCalledWith('chatbot');
  });

  test('이미 active인 탭을 다시 클릭해도 onNavigate가 호출된다', () => {
    const onNavigate = vi.fn();
    render(<NavBar activeTab="basket" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('수강 바구니'));

    expect(onNavigate).toHaveBeenCalledWith('basket');
  });

  // 아직 구현되지 않은 요구사항: 활성 탭에 접근성 속성 aria-current="page"가 있어야
  // 스크린 리더 사용자가 현재 어느 탭에 있는지 알 수 있다. NavBar.jsx는 현재
  // className만 바꿀 뿐 aria-current를 설정하지 않으므로 이 테스트는 실패해야 정상이다.
  test('active 탭에는 aria-current="page"가 설정된다', () => {
    render(<NavBar activeTab="basket" onNavigate={() => {}} />);

    expect(screen.getByText('수강 바구니')).toHaveAttribute('aria-current', 'page');
  });
});
