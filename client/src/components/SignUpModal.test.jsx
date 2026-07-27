import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignUpModal from './SignUpModal';
import * as AuthContext from '../contexts/AuthContext';
import { supabase } from '../api/supabaseClient';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    }
  }
}));

// mock fetch for check-username
global.fetch = vi.fn();

describe('SignUpModal', () => {
  const mockSignup = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    AuthContext.useAuth.mockReturnValue({
      signup: mockSignup,
    });
  });

  it('전북대학교 이메일이 아닐 경우 에러를 표시한다 (Validation)', async () => {
    render(<SignUpModal isOpen={true} onClose={mockOnClose} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const emailInput = screen.getByPlaceholderText('example@jbnu.ac.kr');
    const sendOtpButton = screen.getByRole('button', { name: '인증번호 발송' });

    fireEvent.change(emailInput, { target: { value: 'test@gmail.com' } });
    fireEvent.click(sendOtpButton);

    const errorMessage = await screen.findByText('전북대학교 이메일(@jbnu.ac.kr)만 사용 가능합니다');
    expect(errorMessage).toBeInTheDocument();
  });

  it('인증번호 발송 후 타이머가 나타나고 인증 입력창이 렌더링된다 (Happy Path)', async () => {
    supabase.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: null });
    render(<SignUpModal isOpen={true} onClose={mockOnClose} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const emailInput = screen.getByPlaceholderText('example@jbnu.ac.kr');
    const sendOtpButton = screen.getByRole('button', { name: '인증번호 발송' });

    fireEvent.change(emailInput, { target: { value: 'test@jbnu.ac.kr' } });
    fireEvent.click(sendOtpButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('6자리 인증번호')).toBeInTheDocument();
      expect(screen.getByText(/⏱️/)).toBeInTheDocument();
    });
  });

  it('비밀번호가 일치하지 않으면 에러 메시지를 표시한다 (Validation)', () => {
    render(<SignUpModal isOpen={true} onClose={mockOnClose} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const pwdInput = screen.getByPlaceholderText('8자 이상');
    const pwdConfirmInput = screen.getByPlaceholderText('비밀번호를 다시 입력하세요');

    fireEvent.change(pwdInput, { target: { value: 'password123' } });
    fireEvent.change(pwdConfirmInput, { target: { value: 'password456' } });

    expect(screen.getByText('비밀번호가 일치하지 않습니다')).toBeInTheDocument();
  });

  it('아이디 중복확인 실패 시 에러를 표시한다 (Failure Case)', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({ available: false })
    });
    render(<SignUpModal isOpen={true} onClose={mockOnClose} onSwitchToLogin={mockOnSwitchToLogin} />);
    
    const idInput = screen.getByPlaceholderText('2~20자 영문, 숫자, 밑줄');
    const checkButton = screen.getByRole('button', { name: '중복확인' });

    fireEvent.change(idInput, { target: { value: 'testuser' } });
    fireEvent.click(checkButton);

    const errorMessage = await screen.findByText('이미 사용 중인 아이디입니다');
    expect(errorMessage).toBeInTheDocument();
  });

  it('로그인 링크 클릭 시 onSwitchToLogin이 호출되어야 한다 (Edge Case)', () => {
    render(<SignUpModal isOpen={true} onClose={mockOnClose} onSwitchToLogin={mockOnSwitchToLogin} />);
    const loginLink = screen.getByRole('button', { name: /로그인/i });
    fireEvent.click(loginLink);
    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });
});
