const storageKey = 'noticepilot:v1'
const schemaVersion = 1

export function loadNoticePilotState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey)

    if (!storedValue) {
      return null
    }

    const parsedValue = JSON.parse(storedValue)

    if (parsedValue.schemaVersion !== schemaVersion || !parsedValue.state) {
      window.localStorage.removeItem(storageKey)
      return null
    }

    return parsedValue.state
  } catch {
    window.localStorage.removeItem(storageKey)
    return null
  }
}

export function saveNoticePilotState(state) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion,
        state,
      }),
    )
  } catch {
    window.localStorage.removeItem(storageKey)
  }
}

export function clearNoticePilotState() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(storageKey)
}
