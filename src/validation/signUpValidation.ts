export interface SignUpFieldErrors {
  email?: string;
  password?: string;
  nickname?: string;
}

export function validateSignUpInput(
  email: string,
  password: string,
  nickname: string,
): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};

  if (!email.trim()) errors.email = "이메일을 입력해 주세요.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "올바른 이메일 형식으로 입력해 주세요.";

  if (!password) errors.password = "비밀번호를 입력해 주세요.";
  else if (password.length < 8) errors.password = "비밀번호는 8자 이상이어야 해요.";

  if (!nickname.trim()) errors.nickname = "닉네임을 입력해 주세요.";
  else if (nickname.trim().length < 2 || nickname.trim().length > 20) errors.nickname = "닉네임은 2~20자로 입력해 주세요.";

  return errors;
}
