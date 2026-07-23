// 찜한 레시피 id 목록을 저장하는 모듈.
// 지금은 localStorage지만, 추후 로그인+DB로 바뀌면 이 파일의 구현만 교체한다 (CLAUDE.md 개발 원칙, fridgeStorage.js와 동일 패턴).
const STORAGE_KEY = 'kkinipick.likedRecipes'

export function loadLikedRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLikedRecipes(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}
