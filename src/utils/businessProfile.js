const STORAGE_KEY = "haso-ai:business-profile";

/** 저장된 업장 프로필을 불러옴. 없으면 null 반환 */
export function loadBusinessProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 업장 프로필 저장 */
export function saveBusinessProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage 사용 불가 환경이면 조용히 무시
  }
}