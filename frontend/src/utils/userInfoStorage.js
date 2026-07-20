export const USER_INFO_STORAGE_KEY = 'userInfo'

export function loadUserInfo(defaultForm) {
  try {
    const saved = window.localStorage.getItem(USER_INFO_STORAGE_KEY)
    return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm
  } catch {
    return defaultForm
  }
}

export function saveUserInfoToStorage(form) {
  const data = {
    ...form,
    school: form.school.trim(),
    budget: Number(form.budget),
    commuteDaysPerWeek: Number(form.commuteDaysPerWeek),
  }

  window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(data))
  return data
}
