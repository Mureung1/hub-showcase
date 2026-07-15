// localStorage 래퍼

const PREFIX = 'cjmt:'

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function set(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}

// PREFIX(cjmt:) + prefix로 시작하는 키들을, 앞의 "cjmt:<prefix>" 부분을 뗀 나머지로 반환한다.
// (예: keysWithPrefix('dailyrecord:guest_abc:') -> ['2026-07-13', '2026-07-12', ...])
// localStorage를 직접 순회하는 유일한 지점 — 이 파일 밖에서는 localStorage를 직접 만지지 않는다.
export function keysWithPrefix(prefix) {
  const fullPrefix = PREFIX + prefix
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(fullPrefix)) {
      keys.push(key.slice(fullPrefix.length))
    }
  }
  return keys
}
