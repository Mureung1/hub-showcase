const SESSION_STORAGE_KEY = "careerMissionSession";

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

export const saveSession = (user) => {
  const currentSession = getSession();

  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      school: user.school,
      major: user.major,
      emailVerified: user.emailVerified,
      verifiedAt: user.verifiedAt,
      schoolMeta: user.schoolMeta,
      majorMeta: user.majorMeta,
      token: user.token || currentSession?.token || "",
      loggedInAt: currentSession?.loggedInAt || new Date().toISOString(),
      updatedAt: user.updatedAt || currentSession?.updatedAt,
    })
  );
};

export const getSession = () => {
  return readStoredJson(SESSION_STORAGE_KEY);
};

export const getUser = () => {
  return getSession();
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getAuthToken = () => {
  return getSession()?.token || "";
};
