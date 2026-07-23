import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';

function setup({ loginError = '', isLoggingIn = false } = {}) {
  const onLogin = vi.fn();
  render(<LoginScreen onLogin={onLogin} isLoggingIn={isLoggingIn} loginError={loginError} />);
  return { onLogin };
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
}

describe('LoginScreen', () => {
  it('아이디/비밀번호가 둘 다 비어있으면 제출해도 onLogin이 호출되지 않고 에러가 표시된다', () => {
    const { onLogin } = setup();

    submit();

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByText('아이디와 비밀번호를 모두 입력해주세요.')).toBeInTheDocument();
  });

  it('아이디만 입력하고 비밀번호가 비어있으면 onLogin이 호출되지 않는다', () => {
    const { onLogin } = setup();

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'tester' } });
    submit();

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByText('아이디와 비밀번호를 모두 입력해주세요.')).toBeInTheDocument();
  });

  it('비밀번호만 입력하고 아이디가 비어있으면 onLogin이 호출되지 않는다', () => {
    const { onLogin } = setup();

    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'secret' } });
    submit();

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByText('아이디와 비밀번호를 모두 입력해주세요.')).toBeInTheDocument();
  });

  it('아이디/비밀번호가 둘 다 있으면 onLogin(id, password)이 정확히 호출되고 검증 에러는 없다', () => {
    const { onLogin } = setup();

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'tester' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'secret' } });
    submit();

    expect(onLogin).toHaveBeenCalledWith('tester', 'secret');
    expect(screen.queryByText('아이디와 비밀번호를 모두 입력해주세요.')).not.toBeInTheDocument();
  });

  it('서버에서 받은 loginError는 그대로 표시된다', () => {
    setup({ loginError: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    expect(screen.getByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
  });
});
