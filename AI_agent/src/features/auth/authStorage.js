const USER_STORAGE_KEY = "careerMissionUser";
const PENDING_USER_STORAGE_KEY = "careerMissionPendingUser";

export const saveUser = (user) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const savePendingUser = (user) => {
  localStorage.setItem(PENDING_USER_STORAGE_KEY, JSON.stringify(user));
};

export const getUser = () => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const getPendingUser = () => {
  const storedUser = localStorage.getItem(PENDING_USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(PENDING_USER_STORAGE_KEY);
    return null;
  }
};

export const verifyPendingUser = (token) => {
  const pendingUser = getPendingUser();

  if (!pendingUser || pendingUser.verificationToken !== token) {
    return null;
  }

  const verifiedUser = {
    ...pendingUser,
    emailVerified: true,
    verificationToken: undefined,
  };

  localStorage.removeItem(PENDING_USER_STORAGE_KEY);
  saveUser(verifiedUser);

  return verifiedUser;
};
