import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginModal from './LoginModal';
import * as AuthContext from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LoginModal', () => {
  const mockLogin = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSwitchToSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    AuthContext.useAuth.mockReturnValue({
      login: mockLogin,
    });
  });

  it('비정상 상태(isOpen=false)일 때 렌더링되지 않아야 한다 (Edge Case)', () => {
    const { container } = render(<LoginModal isOpen={false} onClose={mockOnClose} onSwitchToSignUp={mockOnSwitchToSignUp} />);
    expect(container.firstChild).toBeNull();
  });

  it('아이디와 비밀번호가 비어있으면 로그인 버튼이 비활성화되어야 한다 (Validation)', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} onSwitchToSignUp={mockOnSwitchToSignUp} />);
    const loginButton = screen.getByRole('button', { name: /🔑 로그인/i });
    expect(loginButton).toBeDisabled();
  });

  it('올바른 정보 입력 후 로그인 버튼 클릭 시 login이 호출되고 닫혀야 한다 (Happy Path)', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });
    render(<LoginModal isOpen={true} onClose={mockOnClose} onSwitchToSignUp={mockOnSwitchToSignUp} />);

    const idInput = screen.getByPlaceholderText('아이디를 입력하세요');
    const pwdInput = screen.getByPlaceholderText('비밀번호를 입력하세요');
    const loginButton = screen.getByRole('button', { name: /🔑 로그인/i });

    fireEvent.change(idInput, { target: { value: 'testuser' } });
    fireEvent.change(pwdInput, { target: { value: 'password123' } });

    expect(loginButton).not.toBeDisabled();
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('로그인 실패 시 에러 메시지를 표시해야 한다 (Failure Case)', async () => {
    mockLogin.mockRejectedValueOnce(new Error('아이디 또는 비밀번호가 올바르지 않습니다'));
    render(<LoginModal isOpen={true} onClose={mockOnClose} onSwitchToSignUp={mockOnSwitchToSignUp} />);

    const idInput = screen.getByPlaceholderText('아이디를 입력하세요');
    const pwdInput = screen.getByPlaceholderText('비밀번호를 입력하세요');
    const loginButton = screen.getByRole('button', { name: /🔑 로그인/i });

    fireEvent.change(idInput, { target: { value: 'wronguser' } });
    fireEvent.change(pwdInput, { target: { value: 'wrongpass' } });
    fireEvent.click(loginButton);

    const errorMessage = await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다');
    expect(errorMessage).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('회원가입 링크 클릭 시 onSwitchToSignUp이 호출되어야 한다 (Edge Case)', () => {
    render(<LoginModal isOpen={true} onClose={mockOnClose} onSwitchToSignUp={mockOnSwitchToSignUp} />);
    const signUpLink = screen.getByRole('button', { name: /회원가입/i });
    fireEvent.click(signUpLink);
    expect(mockOnSwitchToSignUp).toHaveBeenCalled();
  });
});
