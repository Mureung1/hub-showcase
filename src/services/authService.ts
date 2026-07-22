import { getSupabaseBrowserClient } from "../lib/supabase";

export interface SignUpInput {
  email: string;
  password: string;
  nickname: string;
}

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

function getFriendlySignUpError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("already registered") || normalizedMessage.includes("already exists")) {
    return "이미 가입된 이메일이에요.";
  }

  if (normalizedMessage.includes("nickname") || normalizedMessage.includes("database error")) {
    return "이미 사용 중인 닉네임이에요.";
  }

  if (normalizedMessage.includes("password")) {
    return "비밀번호는 8자 이상으로 입력해 주세요.";
  }

  return "회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function signUp({ email, password, nickname }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });

  if (error) {
    throw new Error(getFriendlySignUpError(error.message));
  }

  if (!data.user) {
    throw new Error("가입 결과를 확인하지 못했어요. 다시 시도해 주세요.");
  }

  if (data.user.identities?.length === 0) {
    throw new Error("이미 가입된 이메일이에요.");
  }

  return { requiresEmailConfirmation: data.session === null };
}
