const USER_STORAGE_KEY = "careerMissionUser";
const PENDING_USER_STORAGE_KEY = "careerMissionPendingUser";
const SESSION_STORAGE_KEY = "careerMissionSession";

export const saveUser = (user) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const updateUserProfile = (updates) => {
  const user = getUser();

  if (!user) {
    return null;
  }

  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveUser(updatedUser);

  const session = getSession();
  if (session?.id === updatedUser.id) {
    saveSession(updatedUser);
  }

  return updatedUser;
};

export const savePendingUser = (user) => {
  localStorage.setItem(PENDING_USER_STORAGE_KEY, JSON.stringify(user));
};

const readStoredJson = (key) => {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

export const getUser = () => {
  return readStoredJson(USER_STORAGE_KEY);
};

export const saveSession = (user) => {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      loggedInAt: new Date().toISOString(),
    })
  );
};

export const getSession = () => {
  return readStoredJson(SESSION_STORAGE_KEY);
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const clearPendingUser = () => {
  localStorage.removeItem(PENDING_USER_STORAGE_KEY);
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  clearSession();
};

export const getPendingUser = () => {
  return readStoredJson(PENDING_USER_STORAGE_KEY);
};

export const findAccountByEmail = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = getUser();
  const pendingUser = getPendingUser();

  if (user?.email?.toLowerCase() === normalizedEmail) {
    return { ...user, storageType: "user" };
  }

  if (pendingUser?.email?.toLowerCase() === normalizedEmail) {
    return { ...pendingUser, storageType: "pending" };
  }

  return null;
};

export const resetStoredPassword = ({ account, email, newPassword }) => {
  const normalizedAccount = String(account || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = getUser();
  const pendingUser = getPendingUser();

  if (
    user &&
    (user.username === normalizedAccount || user.email === normalizedAccount) &&
    user.email?.toLowerCase() === normalizedEmail
  ) {
    const updatedUser = { ...user, password: newPassword };
    saveUser(updatedUser);
    return { ...updatedUser, storageType: "user" };
  }

  if (
    pendingUser &&
    (pendingUser.username === normalizedAccount ||
      pendingUser.email === normalizedAccount) &&
    pendingUser.email?.toLowerCase() === normalizedEmail
  ) {
    const updatedPendingUser = { ...pendingUser, password: newPassword };
    savePendingUser(updatedPendingUser);
    return { ...updatedPendingUser, storageType: "pending" };
  }

  return null;
};

export const verifyPendingUser = (token) => {
  const pendingUser = getPendingUser();
  const existingUser = getUser();
  const normalizedToken = String(token || "").trim();

  if (
    !pendingUser &&
    existingUser?.emailVerified &&
    existingUser.verificationToken === normalizedToken
  ) {
    return existingUser;
  }

  if (!pendingUser || pendingUser.verificationToken !== normalizedToken) {
    return null;
  }

  const verifiedUser = {
    ...pendingUser,
    emailVerified: true,
    verifiedAt: new Date().toISOString(),
  };

  localStorage.removeItem(PENDING_USER_STORAGE_KEY);
  saveUser(verifiedUser);

  return verifiedUser;
};

export const verifyCurrentPendingUser = () => {
  const pendingUser = getPendingUser();

  if (!pendingUser) {
    return null;
  }

  const verifiedUser = {
    ...pendingUser,
    emailVerified: true,
    verifiedAt: new Date().toISOString(),
  };

  localStorage.removeItem(PENDING_USER_STORAGE_KEY);
  saveUser(verifiedUser);

  return verifiedUser;
};
