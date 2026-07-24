import { getSupabaseBrowserClient } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

export interface SignUpInput {
  email: string;
  password: string;
  nickname: string;
}

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthProfile {
  id: string;
  nickname: string;
  bio: string;
  avatarUrl: string | null;
}

function getFriendlySignUpError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("already registered") || normalizedMessage.includes("already exists")) {
    return "이미 가입된 이메일이에요.";
  }

  if (
    normalizedMessage.includes("nickname")
    || normalizedMessage.includes("profiles_nickname_normalized_key")
    || normalizedMessage.includes("duplicate key")
  ) {
    return "이미 사용 중인 닉네임이에요.";
  }

  if (normalizedMessage.includes("password")) {
    return "비밀번호는 8자 이상으로 입력해 주세요.";
  }

  return "회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function isDatabaseSavingError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("database error")
    && normalizedMessage.includes("saving new user");
}

export async function signUp({ email, password, nickname }: SignUpInput): Promise<SignUpResult> {
  const supabase = getSupabaseBrowserClient();
  const normalizedNickname = nickname.trim();
  const { data: isAvailable, error: availabilityError } = await supabase.rpc(
    "is_nickname_available",
    { candidate: normalizedNickname },
  );

  if (availabilityError) {
    throw new Error("닉네임 중복 여부를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  if (!isAvailable) {
    throw new Error("이미 사용 중인 닉네임이에요.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname: normalizedNickname },
    },
  });

  if (error) {
    if (isDatabaseSavingError(error.message)) {
      const retryResult = await supabase.rpc(
        "is_nickname_available",
        { candidate: normalizedNickname },
      );

      if (!retryResult.error && retryResult.data === false) {
        throw new Error("이미 사용 중인 닉네임이에요.");
      }
    }

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

function getFriendlySignInError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "이메일 확인을 완료한 뒤 로그인해 주세요.";
  }

  if (normalizedMessage.includes("too many requests") || normalizedMessage.includes("rate limit")) {
    return "로그인 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }

  return "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export async function signIn({ email, password }: SignInInput): Promise<Session> {
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(getFriendlySignInError(error.message));
  }

  if (!data.session) {
    throw new Error("로그인 세션을 확인하지 못했어요. 다시 시도해 주세요.");
  }

  return data.session;
}

export async function getCurrentSession() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();

  if (error) {
    throw new Error("로그인 상태를 확인하지 못했어요.");
  }

  return data.session;
}

export async function getProfile(userId: string): Promise<AuthProfile> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("profiles")
    .select("id, nickname, bio, avatar_url")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("프로필을 불러오지 못했어요.");
  }

  return {
    id: data.id,
    nickname: data.nickname,
    bio: data.bio,
    avatarUrl: data.avatar_url,
  };
}

export function subscribeToAuthChanges(onSessionChange: (session: Session | null) => void) {
  const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => onSessionChange(session), 0);
  });

  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  const { error } = await getSupabaseBrowserClient().auth.signOut();

  if (error) {
    throw new Error("로그아웃하지 못했어요. 다시 시도해 주세요.");
  }
}
