import {
  clearSession,
  findAccountByEmail,
  getPendingUser,
  getSession,
  getUser,
  savePendingUser,
  saveSession,
} from "./authStorage";

const normalizeValue = (value) => String(value || "").trim();

export const isAuthenticated = () => {
  return Boolean(getSession());
};

export const getCurrentSession = () => {
  return getSession();
};

export const registerUser = (user) => {
  const username = normalizeValue(user.username);
  const email = normalizeValue(user.email);
  const existingUser = getUser();
  const pendingUser = getPendingUser();

  if (
    existingUser?.username === username ||
    pendingUser?.username === username
  ) {
    return {
      ok: false,
      message: "이미 존재하는 아이디입니다.",
    };
  }

  if (existingUser?.email === email || pendingUser?.email === email) {
    return {
      ok: false,
      message: "이미 가입했거나 인증 대기 중인 이메일입니다.",
    };
  }

  const pendingAccount = {
    ...user,
    username,
    email,
  };

  savePendingUser(pendingAccount);

  return {
    ok: true,
    user: pendingAccount,
  };
};

export const loginUser = ({ account, password }) => {
  const normalizedAccount = normalizeValue(account);

  if (!normalizedAccount || !password) {
    return {
      ok: false,
      message: "아이디 또는 이메일과 비밀번호를 입력해 주세요.",
    };
  }

  const user = getUser();
  const pendingUser = getPendingUser();

  if (
    pendingUser &&
    (pendingUser.username === normalizedAccount ||
      pendingUser.email === normalizedAccount)
  ) {
    return {
      ok: false,
      message: "이메일 인증이 완료되어야 로그인할 수 있습니다.",
    };
  }

  if (
    !user ||
    (user.username !== normalizedAccount && user.email !== normalizedAccount)
  ) {
    return {
      ok: false,
      message: "가입된 계정을 찾을 수 없습니다.",
    };
  }

  if (!user.emailVerified) {
    return {
      ok: false,
      message: "이메일 인증이 완료되어야 로그인할 수 있습니다.",
    };
  }

  if (user.password !== password) {
    return {
      ok: false,
      message: "비밀번호가 일치하지 않습니다.",
    };
  }

  saveSession(user);

  return {
    ok: true,
    user,
  };
};

export const logoutUser = () => {
  clearSession();
};

export const findLoginAccountByEmail = (email) => {
  return findAccountByEmail(email);
};
