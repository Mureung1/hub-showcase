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

// localStorage 용량 초과(QuotaExceededError) 등은 여기서 잡아 조용히 로그만 남긴다 — 그러지 않으면
// 이 함수를 부르는 14곳 중 try/catch 없이 동기 이벤트 핸들러에서 직접 호출하는 곳들(예:
// WaterIntakeCard의 물잔 탭)이 예외로 그 자리에서 멈춰버린다. 반환값(성공 여부)은 저장 실패를
// 사용자에게 꼭 알려야 하는 호출부(끼니 저장 등, 이미 try/catch로 감싸져 토스트를 띄움)만 선택적으로
// 확인하면 된다.
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`localStorage set 실패 [${key}]:`, err)
    return false
  }
}

// get/set과 같은 이유로 감싼다(안정성 점검(Phase B)) — localStorage 접근 자체가 막힌 컨텍스트(사파리
// 시크릿 모드의 일부 구버전 등)에서는 removeItem도 던질 수 있다. 지우는 동작이라 실패해도 데이터
// 유실은 아니고(그 키가 그냥 남는 것뿐), 여기서 막지 않으면 호출부가 또 하나씩 try/catch를 들고
// 있어야 한다.
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch (err) {
    console.error(`localStorage remove 실패 [${key}]:`, err)
  }
}

// PREFIX(cjmt:) + prefix로 시작하는 키들을, 앞의 "cjmt:<prefix>" 부분을 뗀 나머지로 반환한다.
// (예: keysWithPrefix('dailyrecord:guest_abc:') -> ['2026-07-13', '2026-07-12', ...])
// localStorage를 직접 순회하는 유일한 지점 — 이 파일 밖에서는 localStorage를 직접 만지지 않는다.
export function keysWithPrefix(prefix) {
  const fullPrefix = PREFIX + prefix
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(fullPrefix)) {
        keys.push(key.slice(fullPrefix.length))
      }
    }
  } catch (err) {
    console.error(`localStorage 순회 실패 [${prefix}]:`, err)
  }
  return keys
}
