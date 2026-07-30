import type { User } from '@supabase/supabase-js';

/** Supabase obfuscated signup response when the email is already registered. */
export function isDuplicateSignup(user: User | null | undefined): boolean {
  if (!user) return false;
  return (user.identities?.length ?? 0) === 0;
}

export function formatAuthError(message: string): string {
  const normalized = message.trim();

  if (normalized === 'Invalid login credentials') {
    return '이메일 또는 비밀번호가 올바르지 않습니다. Google로 가입하셨다면 Google 로그인을 이용하거나, 비밀번호 찾기로 이메일 로그인을 설정해 주세요.';
  }

  if (normalized === 'Email not confirmed') {
    return '이메일 인증이 완료되지 않았습니다. 받은 편지함(스팸 포함)에서 인증 메일을 확인해 주세요.';
  }

  if (normalized === 'User already registered') {
    return '이미 가입된 이메일입니다. 로그인 또는 Google 로그인을 이용해 주세요.';
  }

  return normalized;
}

export function providerLabel(provider: string): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'email':
      return '이메일/비밀번호';
    default:
      return provider;
  }
}
